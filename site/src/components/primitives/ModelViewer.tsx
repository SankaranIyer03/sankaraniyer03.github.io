import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '../../lib/motion'

interface ModelViewerProps {
  /** Path under /public, e.g. "/models/drivetrain.glb". Omit to show the drop-in state. */
  src?: string
  label: string
  caption?: string
  /** Spin on first paint. Forced off under reduced motion. */
  autoRotate?: boolean
  /** How far a part travels at 100% explode, as a fraction of the model's size. */
  explodeSpread?: number
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                              */
/* -------------------------------------------------------------------------- */

/**
 * CAD exports arrive in whatever units and origin the modeller happened to
 * use — millimetres, inches, metres, and geometry parked far off-origin. Every
 * model is therefore measured and rescaled to the same view volume before it
 * reaches the camera, so framing is independent of the source file.
 */
const TARGET_SIZE = 2
const FOV = 38
const VIEW_DIR = new THREE.Vector3(3, 2.2, 4.2).normalize()
const SURFACE_COLOR = '#fdfdfb'
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

interface ExplodePart {
  object: THREE.Object3D
  /** Position in the parent's local space with no separation applied. */
  base: THREE.Vector3
  /** Unit outward vector, also in the parent's local space. */
  dir: THREE.Vector3
  /** Travel at 100%, in the parent's local units. */
  span: number
}

interface CameraFit {
  distance: number
  near: number
  far: number
  minDistance: number
  maxDistance: number
}

interface ModelReport {
  /** Bounding box extents in the source file's own units. */
  size: [number, number, number]
  maxDim: number
  scale: number
  /** Separable top-level children — 0 or 1 means a single merged body. */
  parts: number
  meshes: number
  triangles: number
}

interface Prepared {
  holder: THREE.Group
  materials: THREE.MeshStandardMaterial[]
  geometries: THREE.BufferGeometry[]
  parts: ExplodePart[]
  fit: CameraFit
  report: ModelReport
}

/**
 * One matte near-white surface per source material. SolidWorks exports carry
 * chrome and rubber PBR values that read as noise at this scale, so only the
 * geometry is kept.
 */
function surfaceFrom(source: THREE.Material): THREE.MeshStandardMaterial {
  const next =
    source instanceof THREE.MeshStandardMaterial && !(source instanceof THREE.MeshPhysicalMaterial)
      ? source.clone()
      : new THREE.MeshStandardMaterial()

  next.name = source.name
  next.color = new THREE.Color(SURFACE_COLOR)
  next.roughness = 0.5
  next.metalness = 0.05
  next.flatShading = false
  next.side = THREE.DoubleSide
  next.wireframe = false
  next.transparent = false
  next.opacity = 1
  next.vertexColors = false
  next.emissive = new THREE.Color(0x000000)
  next.map = null
  next.normalMap = null
  next.roughnessMap = null
  next.metalnessMap = null
  next.emissiveMap = null
  next.alphaMap = null
  next.aoMap = null
  next.envMap = null
  next.needsUpdate = true
  return next
}

function holdsGeometry(object: THREE.Object3D): boolean {
  let found = false
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) found = true
  })
  return found
}

/**
 * Exporters wrap everything in a chain of single-child groups. Walk past them
 * to the node whose children are the actual parts.
 */
function assemblyRoot(object: THREE.Object3D): THREE.Object3D {
  let node = object
  while (node.children.length === 1 && !(node instanceof THREE.Mesh)) node = node.children[0]
  return node
}

/**
 * Clones the cached glTF scene, restyles it, measures it, and returns it
 * wrapped in a group that recentres and rescales it. Returns null when the
 * file carries no renderable geometry.
 */
function buildScene(source: THREE.Object3D, spread: number): Prepared | null {
  const root = source.clone(true)
  root.updateMatrixWorld(true)

  const materials: THREE.MeshStandardMaterial[] = []
  const geometries: THREE.BufferGeometry[] = []
  let meshes = 0
  let triangles = 0

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return
    meshes += 1

    let geometry = child.geometry
    if (!geometry.getAttribute('normal')) {
      // Own the geometry before mutating it — the loader cache shares it.
      geometry = geometry.clone()
      geometry.computeVertexNormals()
      geometries.push(geometry)
      child.geometry = geometry
    }
    const index = geometry.getIndex()
    const position = geometry.getAttribute('position')
    if (index) triangles += Math.floor(index.count / 3)
    else if (position) triangles += Math.floor(position.count / 3)

    if (Array.isArray(child.material)) {
      const cloned = child.material.map(surfaceFrom)
      materials.push(...cloned)
      child.material = cloned
    } else {
      const cloned = surfaceFrom(child.material)
      materials.push(cloned)
      child.material = cloned
    }
    child.castShadow = false
    child.receiveShadow = false
  })

  const box = new THREE.Box3().setFromObject(root)
  if (box.isEmpty()) return null

  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  if (!Number.isFinite(maxDim) || maxDim <= 0) return null

  /* ---- Explode vectors, measured before the normalising wrapper exists ---- */
  const assembly = assemblyRoot(root)
  const candidates = assembly.children.filter(holdsGeometry)
  const parts: ExplodePart[] = []

  if (candidates.length >= 2) {
    const toLocal = assembly.matrixWorld.clone().invert()
    const localSize = new THREE.Box3()
      .setFromObject(assembly)
      .applyMatrix4(toLocal)
      .getSize(new THREE.Vector3())
    const span = Math.max(localSize.x, localSize.y, localSize.z) * spread
    const hub = center.clone().applyMatrix4(toLocal)

    candidates.forEach((child, i) => {
      const dir = new THREE.Box3()
        .setFromObject(child)
        .getCenter(new THREE.Vector3())
        .applyMatrix4(toLocal)
        .sub(hub)
      if (dir.lengthSq() < 1e-12) {
        // Concentric with the assembly centre: fan it out deterministically.
        const angle = i * GOLDEN_ANGLE
        dir.set(Math.cos(angle), 0, Math.sin(angle))
      }
      parts.push({ object: child, base: child.position.clone(), dir: dir.normalize(), span })
    })
  }

  /* ---- Recentre on the origin, rescale to the shared view volume ---------- */
  const scale = TARGET_SIZE / maxDim
  const holder = new THREE.Group()
  holder.name = 'model-normaliser'
  holder.add(root)
  holder.scale.setScalar(scale)
  holder.position.copy(center).multiplyScalar(-scale)

  const radius = (size.length() / 2) * scale
  const distance = (radius / Math.sin((FOV / 2) * THREE.MathUtils.DEG2RAD)) * 1.12

  return {
    holder,
    materials,
    geometries,
    parts,
    fit: {
      distance,
      near: Math.max(radius / 100, 1e-3),
      far: distance * 8 + radius * 8,
      minDistance: radius * 0.9,
      maxDistance: distance * 3.5,
    },
    report: {
      size: [size.x, size.y, size.z],
      maxDim,
      scale,
      parts: parts.length,
      meshes,
      triangles,
    },
  }
}

/** Only what this component allocated — cached geometry stays put. */
function releasePrepared(prepared: Prepared) {
  for (const material of prepared.materials) material.dispose()
  for (const geometry of prepared.geometries) geometry.dispose()
  prepared.holder.clear()
}

/* -------------------------------------------------------------------------- */
/* Scene                                                                      */
/* -------------------------------------------------------------------------- */

interface ModelProps {
  src: string
  wireframe: boolean
  explode: number
  spread: number
  /** Null once loading finished but the file turned out to have no geometry. */
  onReady: (result: { report: ModelReport; fit: CameraFit } | null) => void
}

function Model({ src, wireframe, explode, spread, onReady }: ModelProps) {
  const { scene } = useGLTF(src)
  const prepared = useMemo(() => buildScene(scene, spread), [scene, spread])
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    onReady(prepared ? { report: prepared.report, fit: prepared.fit } : null)
  }, [onReady, prepared])

  useEffect(() => {
    if (!prepared) return
    return () => releasePrepared(prepared)
  }, [prepared])

  useEffect(() => {
    if (!prepared) return
    for (const material of prepared.materials) material.wireframe = wireframe
    invalidate()
  }, [invalidate, prepared, wireframe])

  useEffect(() => {
    if (!prepared) return
    const t = Math.min(Math.max(explode, 0), 100) / 100
    for (const part of prepared.parts) {
      part.object.position.copy(part.base).addScaledVector(part.dir, part.span * t)
    }
    invalidate()
  }, [explode, invalidate, prepared])

  if (!prepared) return null
  return <primitive object={prepared.holder} />
}

interface RigProps {
  fit: CameraFit | null
  autoRotate: boolean
  /** Bumped to re-run the framing effect. */
  resetToken: number
}

/** Camera clipping and orbit limits both follow the measured model size. */
function Rig({ fit, autoRotate, resetToken }: RigProps) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const camera = useThree((state) => state.camera)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    if (!fit) return
    camera.near = fit.near
    camera.far = fit.far
    camera.updateProjectionMatrix()
    camera.position.copy(VIEW_DIR).multiplyScalar(fit.distance)
    camera.lookAt(0, 0, 0)
    const orbit = controls.current
    if (orbit) {
      orbit.target.set(0, 0, 0)
      orbit.update()
    }
    invalidate()
  }, [camera, fit, invalidate, resetToken])

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate}
      autoRotateSpeed={0.55}
      minDistance={fit ? fit.minDistance : 0.5}
      maxDistance={fit ? fit.maxDistance : 20}
      onChange={() => invalidate()}
    />
  )
}

/* -------------------------------------------------------------------------- */
/* Chrome                                                                     */
/* -------------------------------------------------------------------------- */

const RANGE_CLASS = `h-3.5 w-full cursor-ew-resize appearance-none bg-transparent
  [&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-line-strong
  [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-[11px] [&::-webkit-slider-thumb]:w-[11px]
  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ink
  [&::-webkit-slider-thumb]:bg-paper [&:hover::-webkit-slider-thumb]:border-signal
  [&:hover::-webkit-slider-thumb]:bg-signal
  [&::-moz-range-track]:h-px [&::-moz-range-track]:bg-line-strong
  [&::-moz-range-thumb]:h-[11px] [&::-moz-range-thumb]:w-[11px] [&::-moz-range-thumb]:rounded-none
  [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-paper
  [&:hover::-moz-range-thumb]:border-signal [&:hover::-moz-range-thumb]:bg-signal`

interface ToolButtonProps {
  children: ReactNode
  onClick: () => void
  /** Omit for plain actions so no toggle state is announced. */
  pressed?: boolean
  disabled?: boolean
  title?: string
}

function ToolButton({ children, onClick, pressed, disabled, title }: ToolButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      title={title}
      className={`border px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        pressed
          ? 'border-signal bg-signal text-paper'
          : 'border-line-strong bg-paper/85 text-ink hover:border-ink'
      }`}
    >
      {children}
    </button>
  )
}

function StatePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bp-grid absolute inset-0 grid place-items-center bg-card">
      <div className="max-w-sm px-6 text-center">
        <p className="label label-signal">{title}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{children}</p>
      </div>
    </div>
  )
}

/** Real bytes-loaded progress from the loading manager, not a spinner. */
function LoadPanel({ label }: { label: string }) {
  const { progress, item } = useProgress()
  const pct = Math.min(100, Math.max(0, Math.round(progress)))
  const file = item ? item.split('/').pop() : undefined

  return (
    <div
      role="status"
      aria-live="polite"
      className="bp-grid absolute inset-0 grid place-items-center bg-card"
    >
      <div className="w-60 max-w-full px-6">
        <div className="flex items-baseline justify-between gap-3">
          <span className="label truncate">Loading model</span>
          <span className="tnum font-mono text-[11px] text-ink">{pct}%</span>
        </div>
        <div className="mt-2 h-px w-full bg-line">
          <div className="h-px bg-signal transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 truncate font-mono text-[10px] text-ink-faint">{file ?? label}</p>
      </div>
    </div>
  )
}

interface BoundaryProps {
  children: ReactNode
  fallback: ReactNode
  onError: () => void
}

/**
 * A malformed or missing GLB rejects inside Suspense. React Three Fiber
 * re-throws loader failures out of the canvas, so catching here keeps one bad
 * file from white-screening the whole project page.
 */
class ModelBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[ModelViewer] model failed to load', error)
    this.props.onError()
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function Frame({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <figure className="reg-marks relative border border-line bg-card">
      {children}
      {caption && (
        <figcaption className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

/** Source units are unknowable from a GLB, so extents are shown unit-agnostic. */
function formatExtent(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 100) return v.toFixed(0)
  if (abs >= 10) return v.toFixed(1)
  if (abs >= 1) return v.toFixed(2)
  return v.toFixed(3)
}

function formatCount(n: number): string {
  return n >= 10000 ? `${(n / 1000).toFixed(0)}k` : n.toLocaleString('en-US')
}

/* -------------------------------------------------------------------------- */
/* Viewer                                                                     */
/* -------------------------------------------------------------------------- */

type ViewerProps = Omit<ModelViewerProps, 'src'> & { src: string }

function Viewer({
  src,
  label,
  caption,
  autoRotate: autoRotateInitial = true,
  explodeSpread = 0.55,
}: ViewerProps) {
  const reduced = usePrefersReducedMotion()
  const sliderId = useId()
  const hostRef = useRef<HTMLDivElement>(null)

  const [inView, setInView] = useState(false)
  const [wireframe, setWireframe] = useState(false)
  const [spin, setSpin] = useState(autoRotateInitial)
  const [explode, setExplode] = useState(0)
  const [resetToken, setResetToken] = useState(0)
  const [loaded, setLoaded] = useState<{ report: ModelReport; fit: CameraFit } | null>(null)
  const [degenerate, setDegenerate] = useState(false)
  const [failed, setFailed] = useState(false)

  /* WebGL contexts are expensive and these viewers sit deep in long pages, so
     nothing is mounted until the frame is close to the viewport. */
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '250px 0px' },
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  const handleReady = useCallback((result: { report: ModelReport; fit: CameraFit } | null) => {
    setLoaded(result)
    setDegenerate(result === null)
  }, [])

  const handleError = useCallback(() => setFailed(true), [])

  const rotating = spin && !reduced
  const report = loaded?.report
  const showChrome = !failed && !degenerate
  const explodable = (report?.parts ?? 0) >= 2

  return (
    <Frame caption={caption}>
      <div ref={hostRef} className="relative aspect-16/10">
        {inView && (
          <ModelBoundary
            key={src}
            onError={handleError}
            fallback={
              <StatePanel title={`${label} — model unavailable`}>
                The 3D view could not be loaded from{' '}
                <code className="font-mono text-[13px] text-ink">{src}</code>. The rest of this page
                is unaffected.
              </StatePanel>
            }
          >
            <div
              className="absolute inset-0"
              role="img"
              aria-label={`Interactive 3D model of ${label}. Drag to orbit.`}
            >
              <Canvas
                dpr={[1, 2]}
                camera={{ position: [3, 2.2, 4.2], fov: FOV, near: 0.01, far: 100 }}
                gl={{ antialias: true }}
                frameloop={rotating ? 'always' : 'demand'}
              >
                <ambientLight intensity={1.1} />
                <directionalLight position={[4, 6, 8]} intensity={1.4} />
                <directionalLight position={[-5, -2, -4]} intensity={0.4} />
                <Suspense fallback={null}>
                  <Model
                    src={src}
                    wireframe={wireframe}
                    explode={explode}
                    spread={explodeSpread}
                    onReady={handleReady}
                  />
                </Suspense>
                <Rig fit={loaded?.fit ?? null} autoRotate={rotating} resetToken={resetToken} />
              </Canvas>
            </div>
          </ModelBoundary>
        )}

        {!failed && degenerate && (
          <StatePanel title={`${label} — no geometry`}>
            The file at <code className="font-mono text-[13px] text-ink">{src}</code> loaded but
            contains no renderable meshes.
          </StatePanel>
        )}

        {!failed && !degenerate && !report && <LoadPanel label={src.split('/').pop() ?? src} />}

        {showChrome && (
          <>
            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
              <ToolButton
                onClick={() => setWireframe((w) => !w)}
                pressed={wireframe}
                disabled={!report}
                title="Show the mesh as hairlines"
              >
                Wireframe
              </ToolButton>
              <ToolButton
                onClick={() => setSpin((s) => !s)}
                pressed={rotating}
                disabled={!report || reduced}
                title={reduced ? 'Disabled: reduced motion is on' : 'Orbit the model continuously'}
              >
                Auto-rotate
              </ToolButton>
              <ToolButton
                onClick={() => setResetToken((t) => t + 1)}
                disabled={!report}
                title="Return to the default framing"
              >
                Reset view
              </ToolButton>
            </div>

            {report && (
              <div className="pointer-events-none absolute top-3 right-3 border border-line bg-paper/85 px-2 py-1 text-right">
                <p className="label text-[9px]">Extent</p>
                <p className="tnum font-mono text-[10px] text-ink">
                  {report.size.map(formatExtent).join(' × ')}
                </p>
                <p className="font-mono text-[9px] text-ink-faint">
                  {report.parts >= 2 ? `${report.parts} parts` : 'single body'} ·{' '}
                  {formatCount(report.triangles)} tri
                </p>
              </div>
            )}

            {explodable && (
              <div className="absolute bottom-3 left-3 w-44 border border-line-strong bg-paper/90 px-2.5 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor={sliderId} className="label text-[9px]">
                    Explode
                  </label>
                  <span className="tnum font-mono text-[10px] text-ink">{explode}%</span>
                </div>
                <input
                  id={sliderId}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={explode}
                  aria-valuetext={`${explode} percent separation`}
                  onChange={(event) => setExplode(Number(event.target.value))}
                  className={RANGE_CLASS}
                />
              </div>
            )}

            <span className="pointer-events-none absolute right-3 bottom-3 label">
              Drag to orbit
            </span>
          </>
        )}
      </div>
    </Frame>
  )
}

/**
 * Viewer for real CAD exports. Until a GLB is supplied it renders an explicit
 * empty state rather than a fake model — the slot is visible and labelled so
 * it's obvious what to drop in.
 */
export function ModelViewer({ src, label, caption, ...rest }: ModelViewerProps) {
  if (!src) {
    return (
      <Frame caption={caption}>
        <div className="bp-grid grid aspect-16/10 place-items-center">
          <div className="max-w-sm px-6 text-center">
            <p className="label">Model slot — {label}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Drop a <code className="font-mono text-[13px] text-ink">.glb</code> export into{' '}
              <code className="font-mono text-[13px] text-ink">site/public/models/</code> and this
              becomes an orbitable 3D view of the real part.
            </p>
          </div>
        </div>
      </Frame>
    )
  }

  // Keyed so a new file starts from a clean camera, toolbar, and error state.
  return <Viewer key={src} src={src} label={label} caption={caption} {...rest} />
}
