import { Suspense, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Bounds, Center, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { usePrefersReducedMotion } from '../../lib/motion'

interface ModelViewerProps {
  /** Path under /public, e.g. "/models/drivetrain.glb". Omit to show the drop-in state. */
  src?: string
  label: string
  caption?: string
}

function LoadedModel({ src, wireframe }: { src: string; wireframe: boolean }) {
  const { scene } = useGLTF(src)

  scene.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const mat = child.material as THREE.MeshStandardMaterial
      mat.wireframe = wireframe
      mat.color = new THREE.Color('#fdfdfb')
      mat.roughness = 0.5
      mat.metalness = 0.05
    }
  })

  return (
    <Bounds fit clip observe margin={1.15}>
      <Center>
        <primitive object={scene} />
      </Center>
    </Bounds>
  )
}

/**
 * Viewer for real CAD exports. Until a GLB is supplied it renders an explicit
 * empty state rather than a fake model — the slot is visible and labelled so
 * it's obvious what to drop in.
 */
export function ModelViewer({ src, label, caption }: ModelViewerProps) {
  const reduced = usePrefersReducedMotion()
  const [wireframe, setWireframe] = useState(false)

  if (!src) {
    return (
      <figure className="reg-marks relative border border-line bg-card">
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
        {caption && (
          <figcaption className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-muted">
            {caption}
          </figcaption>
        )}
      </figure>
    )
  }

  return (
    <figure className="reg-marks relative border border-line bg-card">
      <div className="relative aspect-16/10">
        <Canvas dpr={[1, 2]} camera={{ position: [3, 2.2, 4.2], fov: 40 }} gl={{ antialias: true }}>
          <ambientLight intensity={1.1} />
          <directionalLight position={[4, 6, 8]} intensity={1.4} />
          <directionalLight position={[-5, -2, -4]} intensity={0.4} />
          <Suspense fallback={null}>
            <LoadedModel src={src} wireframe={wireframe} />
          </Suspense>
          <OrbitControls
            makeDefault
            enablePan={false}
            autoRotate={!reduced}
            autoRotateSpeed={0.55}
            minDistance={2}
            maxDistance={12}
          />
        </Canvas>

        <div className="absolute top-3 left-3 flex gap-2">
          <button
            type="button"
            onClick={() => setWireframe((w) => !w)}
            aria-pressed={wireframe}
            className={`border px-2.5 py-1 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors ${
              wireframe
                ? 'border-signal bg-signal text-paper'
                : 'border-line-strong bg-paper/85 text-ink hover:border-ink'
            }`}
          >
            Wireframe
          </button>
        </div>

        <span className="pointer-events-none absolute right-3 bottom-3 label">Drag to orbit</span>
      </div>

      {caption && (
        <figcaption className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-muted">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
