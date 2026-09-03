import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { acts, actArc, type Act, type ActId } from '../../content/acts'
import { usePrefersReducedMotion } from '../../lib/motion'

const INK = '#111110'
const SIGNAL = '#e5471b'
const RING_R = 2.8

const rad = (deg: number) => (deg * Math.PI) / 180

/* ------------------------------------------------------------------ */
/* The part at the centre of the loop.                                 */
/*                                                                     */
/* Generated procedurally rather than loaded from CAD so the diagram    */
/* has no asset dependency.                                            */
/* ------------------------------------------------------------------ */
function makeGearGeometry() {
  const teeth = 18
  const outerR = 1.44
  const rootR = 1.21
  const boreR = 0.37
  const boltR = 0.12
  const boltCircle = 0.82
  const boltCount = 6

  const polar = (a: number, r: number) => new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)
  const step = (Math.PI * 2) / teeth
  const pts: THREE.Vector2[] = []

  for (let i = 0; i < teeth; i++) {
    const base = i * step
    // Trapezoidal tooth: root → flank → crest → flank → root
    pts.push(polar(base - step * 0.26, rootR))
    pts.push(polar(base - step * 0.13, outerR))
    pts.push(polar(base + step * 0.13, outerR))
    pts.push(polar(base + step * 0.26, rootR))
  }

  const shape = new THREE.Shape(pts)

  const bore = new THREE.Path()
  bore.absarc(0, 0, boreR, 0, Math.PI * 2, true)
  shape.holes.push(bore)

  for (let i = 0; i < boltCount; i++) {
    const a = (i / boltCount) * Math.PI * 2 + Math.PI / boltCount
    const hole = new THREE.Path()
    hole.absarc(Math.cos(a) * boltCircle, Math.sin(a) * boltCircle, boltR, 0, Math.PI * 2, true)
    shape.holes.push(hole)
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 2,
    curveSegments: 24,
  })
  geo.center()
  geo.computeVertexNormals()
  return geo
}

/** Spins faster while a pillar is selected, the system responding to input. */
function CenterPart({ still, engaged }: { still: boolean; engaged: boolean }) {
  const group = useRef<THREE.Group>(null)
  const geometry = useMemo(() => makeGearGeometry(), [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 22), [geometry])
  const speed = useRef(0.11)

  useFrame((_, dt) => {
    if (still || !group.current) return
    const target = engaged ? 0.4 : 0.11
    speed.current += (target - speed.current) * (1 - Math.pow(0.005, dt))
    group.current.rotation.z -= dt * speed.current
  })

  return (
    <group ref={group}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#fdfdfb" roughness={0.48} metalness={0.03} />
      </mesh>
      {/* Edge lines are what make it read as a CAD model rather than a blob. */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={INK} transparent opacity={0.5} />
      </lineSegments>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Ring geometry helpers                                               */
/* ------------------------------------------------------------------ */
function ringPoints(radius: number, segments = 180): THREE.Vector3[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = (i / segments) * Math.PI * 2
    return new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0)
  })
}

function arcPoints(radius: number, fromDeg: number, toDeg: number, segments = 48) {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = rad(fromDeg + ((toDeg - fromDeg) * i) / segments)
    return new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0)
  })
}

function DialTicks() {
  const geometry = useMemo(() => {
    const positions: number[] = []
    const count = 96
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      const major = i % 8 === 0
      const inner = RING_R + 0.1
      const outer = RING_R + (major ? 0.3 : 0.17)
      positions.push(
        Math.cos(a) * inner,
        Math.sin(a) * inner,
        0,
        Math.cos(a) * outer,
        Math.sin(a) * outer,
        0,
      )
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [])

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={INK} transparent opacity={0.22} />
    </lineSegments>
  )
}

/**
 * Each act owns a 90° arc of the ring. Highlighting the arc rather than just
 * the node is the whole point of the diagram: a stage is a span of the loop,
 * not a point on it.
 */
function ActArc({ act, active }: { act: Act; active: boolean }) {
  const [from, to] = actArc(act)
  const points = useMemo(() => arcPoints(RING_R, from, to), [from, to])

  return (
    <Line
      points={points}
      color={active ? SIGNAL : INK}
      lineWidth={active ? 3.4 : 1}
      transparent
      opacity={active ? 1 : 0.28}
    />
  )
}

/**
 * Radial spoke from the gear to each node. These are the "connect the systems"
 * half of the diagram, the ring is the sequence, the spokes are the thread
 * back to the middle.
 */
function Spoke({ act, active }: { act: Act; active: boolean }) {
  const points = useMemo(() => {
    const a = rad(act.angle)
    return [
      new THREE.Vector3(Math.cos(a) * 1.62, Math.sin(a) * 1.62, 0),
      new THREE.Vector3(Math.cos(a) * (RING_R - 0.2), Math.sin(a) * (RING_R - 0.2), 0),
    ]
  }, [act.angle])

  return (
    <Line
      points={points}
      color={active ? SIGNAL : INK}
      lineWidth={active ? 2 : 1}
      dashed
      dashSize={0.14}
      gapSize={0.1}
      transparent
      opacity={active ? 0.95 : 0.2}
    />
  )
}

function ActNode({
  act,
  active,
  onSelect,
}: {
  act: Act
  active: boolean
  onSelect?: (id: ActId) => void
}) {
  const squareEdges = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.3, 0.3)), [])
  const a = rad(act.angle)
  const x = Math.cos(a) * RING_R
  const y = Math.sin(a) * RING_R
  const interactive = Boolean(onSelect)

  return (
    <group position={[x, y, 0]}>
      {/* Generous invisible hit area, the visible dot is far too small to click */}
      {interactive && (
        <mesh
          position={[0, 0, 0.05]}
          onClick={(e) => {
            e.stopPropagation()
            onSelect?.(act.id)
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = ''
          }}
        >
          <circleGeometry args={[0.42, 20]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      <mesh scale={active ? 1.55 : 1}>
        <circleGeometry args={[0.07, 24]} />
        <meshBasicMaterial color={active ? SIGNAL : INK} />
      </mesh>
      <lineSegments geometry={squareEdges} scale={active ? 1.5 : 1}>
        <lineBasicMaterial
          color={active ? SIGNAL : INK}
          transparent
          opacity={active ? 0.9 : 0.45}
        />
      </lineSegments>

      {/* Code sits just outside the dial ring, name only when selected */}
      <Html
        center
        position={[Math.cos(a) * 0.78, Math.sin(a) * 0.78, 0]}
        style={{ pointerEvents: 'none' }}
        zIndexRange={[10, 0]}
      >
        <div className="flex flex-col items-center gap-0.5 select-none whitespace-nowrap">
          <span className={`label tnum ${active ? 'label-signal' : ''}`}>{act.code}</span>
          {active && (
            <span className="label label-signal text-[10px]">{act.name}</span>
          )}
        </div>
      </Html>
    </group>
  )
}

/**
 * The travelling pulse. Free-runs around the loop until a pillar is selected,
 * then eases to that node and holds, the thread stops where you are looking.
 */
function Pulse({ still, target }: { still: boolean; target: Act | null }) {
  const dot = useRef<THREE.Mesh>(null)
  const flow = useRef<THREE.Object3D & { material?: { dashOffset: number } }>(null)
  const points = useMemo(() => ringPoints(RING_R), [])
  const angle = useRef(90)

  useFrame((_, dt) => {
    if (still) return

    if (target) {
      // Approach along the shorter direction, then settle.
      let delta = ((target.angle - angle.current + 540) % 360) - 180
      angle.current += delta * (1 - Math.pow(0.002, dt))
    } else {
      angle.current += dt * 41
    }

    if (dot.current) {
      const a = rad(angle.current)
      dot.current.position.set(Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0.03)
    }
    if (flow.current?.material) {
      flow.current.material.dashOffset -= dt * (target ? 0.5 : 1.9)
    }
  })

  const circumference = Math.PI * 2 * RING_R

  return (
    <>
      <Line
        ref={flow as never}
        points={points}
        color={SIGNAL}
        lineWidth={2.2}
        dashed
        dashSize={1.1}
        gapSize={circumference / 2 - 1.1}
        transparent
        opacity={target ? 0.35 : 0.9}
      />
      <mesh ref={dot} position={[0, RING_R, 0.03]}>
        <circleGeometry args={[0.085, 24]} />
        <meshBasicMaterial color={SIGNAL} />
      </mesh>
    </>
  )
}

/** Pointer parallax, a few degrees only. Enough to feel dimensional. */
function ParallaxRig({ children, still }: { children: React.ReactNode; still: boolean }) {
  const group = useRef<THREE.Group>(null)

  useFrame((state, dt) => {
    if (!group.current) return
    const targetY = still ? 0 : state.pointer.x * 0.18
    const targetX = still ? 0 : -state.pointer.y * 0.12
    const k = 1 - Math.pow(0.001, dt)
    group.current.rotation.y += (targetY - group.current.rotation.y) * k
    group.current.rotation.x += (targetX - group.current.rotation.x) * k
  })

  return <group ref={group}>{children}</group>
}

export interface LoopSceneProps {
  /** Selected pillar; highlights its arc, spoke and node. */
  active?: ActId | null
  onSelect?: (id: ActId) => void
}

export function LoopScene({ active = null, onSelect }: LoopSceneProps) {
  const reduced = usePrefersReducedMotion()
  const activeAct = active ? (acts.find((a) => a.id === active) ?? null) : null

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 10.5], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={1.15} />
      <directionalLight position={[4, 6, 8]} intensity={1.5} />
      <directionalLight position={[-5, -3, 4]} intensity={0.45} />

      <Suspense fallback={null}>
        <ParallaxRig still={reduced}>
          {/* Outer reference circle */}
          <Line
            points={ringPoints(RING_R + 0.42)}
            color={INK}
            lineWidth={1}
            transparent
            opacity={0.1}
          />
          <DialTicks />

          {acts.map((act) => (
            <ActArc key={act.id} act={act} active={act.id === active} />
          ))}
          {acts.map((act) => (
            <Spoke key={act.id} act={act} active={act.id === active} />
          ))}
          {acts.map((act) => (
            <ActNode key={act.id} act={act} active={act.id === active} onSelect={onSelect} />
          ))}

          <Pulse still={reduced} target={activeAct} />
          <CenterPart still={reduced} engaged={Boolean(active)} />
        </ParallaxRig>
      </Suspense>
    </Canvas>
  )
}
