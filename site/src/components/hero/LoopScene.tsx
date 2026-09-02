import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import { acts } from '../../content/acts'
import { usePrefersReducedMotion } from '../../lib/motion'

const INK = '#111110'
const SIGNAL = '#e5471b'
const RING_R = 2.8

/* ------------------------------------------------------------------ */
/* The part at the centre of the loop.                                 */
/*                                                                     */
/* Generated procedurally rather than loaded from CAD so the hero has  */
/* no asset dependency — swap in a GLB via <ModelViewer> when real     */
/* exports are available.                                              */
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

function CenterPart({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null)
  const geometry = useMemo(makeGearGeometry, [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 22), [geometry])

  useFrame((_, dt) => {
    if (still || !group.current) return
    group.current.rotation.z -= dt * 0.11
  })

  return (
    <group ref={group} rotation={[0, 0, 0]}>
      <mesh geometry={geometry} castShadow={false}>
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
/* The loop itself: ring, dial ticks, act nodes, travelling pulse.      */
/* ------------------------------------------------------------------ */
function ringPoints(radius: number, segments = 180): THREE.Vector3[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = (i / segments) * Math.PI * 2
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
 * Nodes carry only their act code. The headline beside the loop already reads
 * "01 Design it / 02 Make it / …", so it serves as the legend — which keeps the
 * geometry clean and avoids labels overflowing the canvas at any size.
 */
function ActNodes() {
  const squareEdges = useMemo(
    () => new THREE.EdgesGeometry(new THREE.PlaneGeometry(0.3, 0.3)),
    [],
  )

  return (
    <>
      {acts.map((act) => {
        const rad = (act.angle * Math.PI) / 180
        const x = Math.cos(rad) * RING_R
        const y = Math.sin(rad) * RING_R

        return (
          <group key={act.id} position={[x, y, 0]}>
            {/* Node marker: filled dot inside an outlined square */}
            <mesh>
              <circleGeometry args={[0.07, 24]} />
              <meshBasicMaterial color={INK} />
            </mesh>
            <lineSegments geometry={squareEdges}>
              <lineBasicMaterial color={INK} transparent opacity={0.45} />
            </lineSegments>

            {/* Code, set just outside the dial ring */}
            <Html
              center
              position={[Math.cos(rad) * 0.62, Math.sin(rad) * 0.62, 0]}
              style={{ pointerEvents: 'none' }}
              zIndexRange={[10, 0]}
            >
              <span className="label label-signal tnum select-none">{act.code}</span>
            </Html>
          </group>
        )
      })}
    </>
  )
}

function Pulse({ still }: { still: boolean }) {
  const dot = useRef<THREE.Mesh>(null)
  const flow = useRef<THREE.Object3D & { material?: { dashOffset: number } }>(null)
  const points = useMemo(() => ringPoints(RING_R), [])
  const t = useRef(0)

  useFrame((_, dt) => {
    if (still) return
    t.current += dt * 0.115

    if (dot.current) {
      // Travel counter-clockwise, matching the act order around the ring.
      const a = t.current * Math.PI * 2 + Math.PI / 2
      dot.current.position.set(Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0.02)
    }
    if (flow.current?.material) {
      flow.current.material.dashOffset -= dt * 1.9
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
        opacity={0.9}
      />
      <mesh ref={dot} position={[0, RING_R, 0.02]}>
        <circleGeometry args={[0.085, 24]} />
        <meshBasicMaterial color={SIGNAL} />
      </mesh>
    </>
  )
}

/** Pointer parallax — a few degrees only. Enough to feel dimensional. */
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

export function LoopScene() {
  const reduced = usePrefersReducedMotion()

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
          <Line
            points={ringPoints(RING_R)}
            color={INK}
            lineWidth={1}
            transparent
            opacity={0.28}
          />
          <Line
            points={ringPoints(RING_R + 0.42)}
            color={INK}
            lineWidth={1}
            transparent
            opacity={0.1}
          />
          <DialTicks />
          <ActNodes />
          <Pulse still={reduced} />
          <CenterPart still={reduced} />
        </ParallaxRig>
      </Suspense>
    </Canvas>
  )
}
