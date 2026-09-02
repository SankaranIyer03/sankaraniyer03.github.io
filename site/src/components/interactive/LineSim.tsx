import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useSpring } from 'motion/react'
import { usePrefersReducedMotion } from '../../lib/motion'

/* ===================================================================== *
 * LineSim — a discrete-event model of a nine-station low-voltage
 * circuit-breaker assembly line.
 *
 * The loop is a real time-stepped DES: fixed simulation timestep driven by
 * an accumulator off requestAnimationFrame, seeded PRNG for cycle times,
 * finite inter-station buffers, and explicit blocking / starving. Nothing
 * about the bottleneck is hardcoded — it falls out of the statistics.
 * ===================================================================== */

/* --------------------------------- model types ---------------------- */

interface StationSpec {
  /** Drawing callout, e.g. "ST-04". */
  readonly code: string
  readonly name: string
  /** Operator-paced work content, in seconds. Shrinks with more labour. */
  readonly manual: number
  /** Machine-paced time, in seconds. Labour cannot compress it. */
  readonly auto: number
  /** Most operators the station can physically absorb. */
  readonly maxOps: number
  /** Seconds lost when the incoming variant differs from the last one. */
  readonly changeover: number
  /** Coefficient of variation on cycle time. */
  readonly cv: number
}

type Phase = 'run' | 'setup' | 'blocked' | 'starved'

interface Unit {
  readonly id: number
  readonly variant: number
  readonly born: number
}

interface Station {
  readonly spec: StationSpec
  /** Input buffer. Capacity BUFFER_CAP; this is the visible WIP. */
  queue: Unit[]
  current: Unit | null
  setupLeft: number
  workLeft: number
  workTotal: number
  lastVariant: number
  phase: Phase
  /** Operators assigned, in half-operator increments. */
  ops: number
  /** Nominal cycle at current staffing, seconds. */
  effCycle: number
  /** Low-pass filtered occupancy fractions, 0..1. */
  busy: number
  blocked: number
  starved: number
}

interface SimState {
  /** Simulation clock, seconds. */
  t: number
  rand: () => number
  spare: number | null
  stations: Station[]
  seq: number
  sourceVariant: number
  runLeft: number
  completed: number
  completedStep: number
  /** Exponentially-weighted completion rate, units per second. */
  rate: number
  /** Exponentially-weighted lead time, seconds. */
  lead: number
  /** Index of the busiest station, with hysteresis so co-bottlenecks don't flicker. */
  bottleneck: number
  spark: number[]
  sparkClock: number
}

interface ScenarioSpec {
  readonly key: ScenarioKey
  readonly label: string
  readonly blurb: string
  /** Number of distinct variants released to the line. */
  readonly variants: number
  /** Mean units between variant changes at the release point. */
  readonly runLength: number
  readonly changeoverScale: number
  readonly cvScale: number
}

type ScenarioKey = 'proliferated' | 'standardized'

/* --------------------------------- constants ------------------------ */

const SPECS: readonly StationSpec[] = [
  { code: 'ST-01', name: 'Frame Prep', manual: 34, auto: 0, maxOps: 2, changeover: 18, cv: 0.18 },
  { code: 'ST-02', name: 'Contact Subassembly', manual: 44, auto: 2, maxOps: 2, changeover: 42, cv: 0.22 },
  { code: 'ST-03', name: 'Trip Unit Install', manual: 40, auto: 0, maxOps: 2, changeover: 95, cv: 0.26 },
  { code: 'ST-04', name: 'Arc Chute Fit', manual: 30, auto: 0, maxOps: 2, changeover: 30, cv: 0.2 },
  { code: 'ST-05', name: 'Mechanism Link', manual: 42, auto: 4, maxOps: 2, changeover: 55, cv: 0.24 },
  { code: 'ST-06', name: 'Terminal Assembly', manual: 36, auto: 0, maxOps: 2, changeover: 70, cv: 0.22 },
  // Calibration and Dielectric Test are machine-paced: extra labour cannot
  // compress them, which is what makes the bottleneck migrate on the slider.
  { code: 'ST-07', name: 'Calibration', manual: 10, auto: 26, maxOps: 1, changeover: 120, cv: 0.16 },
  { code: 'ST-08', name: 'Dielectric Test', manual: 5, auto: 24, maxOps: 1, changeover: 20, cv: 0.08 },
  { code: 'ST-09', name: 'Label & Pack', manual: 34, auto: 0, maxOps: 2, changeover: 15, cv: 0.15 },
]

const N = SPECS.length

const SCENARIOS: Record<ScenarioKey, ScenarioSpec> = {
  proliferated: {
    key: 'proliferated',
    label: 'Proliferated catalogue',
    blurb: 'Eight live variants, near-unit batches, full fixture and recipe changeovers.',
    variants: 8,
    runLength: 1.6,
    changeoverScale: 0.55,
    cvScale: 1,
  },
  standardized: {
    key: 'standardized',
    label: 'Standardized platform',
    blurb: 'One base frame plus late-stage add-ons: fewer changeovers, tighter cycles.',
    variants: 3,
    runLength: 8,
    changeoverScale: 0.18,
    cvScale: 0.45,
  },
}

const SEED = 0x5eed17
/** Fixed simulation timestep, seconds. Decoupled from frame rate. */
const DT = 0.2
/** Simulation seconds per wall-clock second at 1x. */
const BASE_RATE = 25
const BUFFER_CAP = 4
/** CONWIP release cap, so WIP is a real variable rather than pinned. */
const WIP_CAP = 20
/** Utilisation low-pass, seconds. Long relative to cycle times, or the bars jitter. */
const TAU_UTIL = 240
/** Completion-rate low-pass, seconds. */
const TAU_RATE = 180
/** A challenger must beat the incumbent by this to be called the bottleneck. */
const BN_MARGIN = 0.03
const SPARK_EVERY = 75
const SPARK_MAX = 64
/** Primed so the first paint shows a running line rather than an empty one. */
const WARMUP = 3600
const WARMUP_STATIC = 9000
const PUBLISH_INTERVAL = 0.16
const LIVE_INTERVAL = 6

const INK = '#111110'
const INK_SOFT = '#3d3d39'
const INK_MUTED = '#76766e'
const INK_FAINT = '#a3a39b'
const LINE = '#dcdad2'
const LINE_STRONG = '#c2bfb4'
const SIGNAL = '#e5471b'
const PAPER = '#f8f7f4'
const CARD = '#ffffff'
const SIGNAL_WASH = '#fdece7'

const VARIANT_SHADES = [INK, INK_SOFT, INK_MUTED, INK_FAINT] as const

const PHASE_TEXT: Record<Phase, string> = { run: 'RUN', setup: 'C/O', blocked: 'BLK', starved: 'STV' }
const PHASE_FILL: Record<Phase, string> = {
  run: INK_SOFT,
  setup: SIGNAL,
  blocked: INK_FAINT,
  starved: INK_FAINT,
}

/* --------------------------------- geometry ------------------------- */

const SW = 88
const SH = 56
const GX = 44
const RG = 56
const MX = 30
const MY = 22
const LANE_X0 = 12
const LANE_W = SW - 24
const LANE_Y = 30
const SLOT_INSET = 8
const SLOT_PITCH = 8

interface Box {
  readonly x: number
  readonly y: number
  readonly row: number
  /** True when the serpentine row runs right-to-left. */
  readonly flip: boolean
}

interface Slot {
  readonly x: number
  readonly y: number
}

interface Gap {
  readonly path: string
  readonly slots: readonly Slot[]
  readonly arrow: { readonly x: number; readonly y: number; readonly rot: number }
}

interface Layout {
  readonly cols: number
  readonly w: number
  readonly h: number
  readonly boxes: readonly Box[]
  readonly gaps: readonly Gap[]
  readonly inlet: string
  readonly outlet: string
}

function buildLayout(cols: number): Layout {
  const rows = Math.ceil(N / cols)
  const w = MX * 2 + cols * SW + (cols - 1) * GX
  const h = MY * 2 + rows * SH + (rows - 1) * RG

  const boxes: Box[] = []
  for (let k = 0; k < N; k++) {
    const row = Math.floor(k / cols)
    const inRow = k % cols
    const flip = row % 2 === 1
    const col = flip ? cols - 1 - inRow : inRow
    boxes.push({ x: MX + col * (SW + GX), y: MY + row * (SH + RG), row, flip })
  }

  const gaps: Gap[] = []
  for (let k = 0; k < N - 1; k++) {
    const a = boxes[k] as Box
    const b = boxes[k + 1] as Box
    const slots: Slot[] = []

    if (a.row === b.row) {
      const y = a.y + SH / 2
      const dir = a.flip ? -1 : 1
      const x0 = a.flip ? a.x : a.x + SW
      const x1 = a.flip ? b.x + SW : b.x
      for (let j = 0; j < BUFFER_CAP; j++) {
        slots.push({ x: x1 - dir * (SLOT_INSET + j * SLOT_PITCH), y })
      }
      gaps.push({
        path: `M ${x0} ${y} H ${x1}`,
        slots,
        arrow: { x: x0 + dir * 4, y, rot: a.flip ? 180 : 0 },
      })
      continue
    }

    // Row transition: drop straight down into the next lane.
    const cx0 = a.x + SW / 2
    const cx1 = b.x + SW / 2
    const y0 = a.y + SH
    const y1 = b.y
    const mid = (y0 + y1) / 2
    for (let j = 0; j < BUFFER_CAP; j++) {
      slots.push({ x: cx1, y: y1 - SLOT_INSET - j * SLOT_PITCH })
    }
    gaps.push({
      path: cx0 === cx1 ? `M ${cx0} ${y0} V ${y1}` : `M ${cx0} ${y0} V ${mid} H ${cx1} V ${y1}`,
      slots,
      arrow: { x: cx0, y: y0 + 7, rot: 90 },
    })
  }

  const first = boxes[0] as Box
  const last = boxes[N - 1] as Box

  return {
    cols,
    w,
    h,
    boxes,
    gaps,
    inlet: `M 6 ${first.y + SH / 2} H ${first.x}`,
    outlet: `M ${last.x + SW / 2} ${last.y + SH} V ${last.y + SH + 13}`,
  }
}

/* --------------------------------- simulation ----------------------- */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gauss(s: SimState): number {
  if (s.spare !== null) {
    const v = s.spare
    s.spare = null
    return v
  }
  let u = 0
  let v = 0
  let q = 0
  do {
    u = s.rand() * 2 - 1
    v = s.rand() * 2 - 1
    q = u * u + v * v
  } while (q === 0 || q >= 1)
  const f = Math.sqrt((-2 * Math.log(q)) / q)
  s.spare = v * f
  return u * f
}

function effCycleOf(spec: StationSpec, ops: number): number {
  return spec.auto + spec.manual / Math.max(0.5, ops)
}

/**
 * Line balancing: every station gets a half-operator to keep the line alive,
 * then remaining labour goes greedily to whichever station is currently the
 * slowest. Machine-paced stations cap out, so extra labour eventually stops
 * helping and the bottleneck migrates — which is the point of the slider.
 */
function allocate(operators: number): number[] {
  const slots = new Array<number>(N).fill(1)
  let left = Math.round(operators * 2) - N
  while (left > 0) {
    let pick = -1
    let worst = -1
    for (let i = 0; i < N; i++) {
      const spec = SPECS[i] as StationSpec
      if ((slots[i] as number) >= spec.maxOps * 2) continue
      const c = effCycleOf(spec, (slots[i] as number) / 2)
      if (c > worst) {
        worst = c
        pick = i
      }
    }
    if (pick < 0) break
    slots[pick] = (slots[pick] as number) + 1
    left -= 1
  }
  return slots.map((s) => s / 2)
}

function createSim(operators: number): SimState {
  const ops = allocate(operators)
  const stations: Station[] = SPECS.map((spec, i) => ({
    spec,
    queue: [],
    current: null,
    setupLeft: 0,
    workLeft: 0,
    workTotal: 1,
    lastVariant: -1,
    phase: 'starved',
    ops: ops[i] as number,
    effCycle: effCycleOf(spec, ops[i] as number),
    busy: 0,
    blocked: 0,
    starved: 1,
  }))

  return {
    t: 0,
    rand: mulberry32(SEED),
    spare: null,
    stations,
    seq: 0,
    sourceVariant: 0,
    runLeft: 0,
    completed: 0,
    completedStep: 0,
    rate: 0,
    lead: 0,
    bottleneck: 0,
    spark: [],
    sparkClock: 0,
  }
}

function wipOf(s: SimState): number {
  let n = 0
  for (let i = 0; i < N; i++) {
    const st = s.stations[i] as Station
    n += st.queue.length
    if (st.current !== null) n += 1
  }
  return n
}

function release(s: SimState, sc: ScenarioSpec): Unit {
  if (s.runLeft <= 0) {
    let v = Math.floor(s.rand() * sc.variants)
    if (v === s.sourceVariant && sc.variants > 1) v = (v + 1) % sc.variants
    s.sourceVariant = v
    s.runLeft = Math.max(1, Math.round(sc.runLength * (0.5 + s.rand())))
  }
  s.runLeft -= 1
  s.seq += 1
  return { id: s.seq, variant: s.sourceVariant, born: s.t }
}

function sampleCycle(s: SimState, st: Station, sc: ScenarioSpec): number {
  const f = 1 + st.spec.cv * sc.cvScale * gauss(s)
  return st.effCycle * Math.min(2.6, Math.max(0.45, f))
}

/** One fixed simulation timestep. Release, then acquire, then advance. */
function stepSim(s: SimState, sc: ScenarioSpec, dt: number): void {
  s.completedStep = 0

  // Downstream-first so a station that frees up lets its upstream neighbour go.
  for (let i = N - 1; i >= 0; i--) {
    const st = s.stations[i] as Station
    const u = st.current
    if (u === null || st.setupLeft > 0 || st.workLeft > 0) continue
    if (i === N - 1) {
      const lead = s.t - u.born
      s.lead = s.lead === 0 ? lead : s.lead + (lead - s.lead) * 0.12
      s.completed += 1
      s.completedStep += 1
      st.current = null
    } else {
      const next = s.stations[i + 1] as Station
      if (next.queue.length < BUFFER_CAP) {
        next.queue.push(u)
        st.current = null
      }
    }
  }

  for (let i = 0; i < N; i++) {
    const st = s.stations[i] as Station
    if (st.current !== null) continue
    let u: Unit | null = null
    if (st.queue.length > 0) u = st.queue.shift() as Unit
    else if (i === 0 && wipOf(s) < WIP_CAP) u = release(s, sc)
    if (u === null) continue
    st.current = u
    const switching = st.lastVariant >= 0 && st.lastVariant !== u.variant
    st.setupLeft = switching ? st.spec.changeover * sc.changeoverScale : 0
    st.lastVariant = u.variant
    st.workTotal = sampleCycle(s, st, sc)
    st.workLeft = st.workTotal
  }

  const k = dt / TAU_UTIL
  let cand = 0
  let best = -1
  for (let i = 0; i < N; i++) {
    const st = s.stations[i] as Station
    let phase: Phase
    if (st.current === null) {
      phase = 'starved'
    } else if (st.setupLeft > 0) {
      st.setupLeft -= dt
      phase = 'setup'
    } else if (st.workLeft > 0) {
      st.workLeft -= dt
      phase = 'run'
    } else {
      phase = 'blocked'
    }
    st.phase = phase
    st.busy += ((phase === 'run' || phase === 'setup' ? 1 : 0) - st.busy) * k
    st.blocked += ((phase === 'blocked' ? 1 : 0) - st.blocked) * k
    st.starved += ((phase === 'starved' ? 1 : 0) - st.starved) * k
    if (st.busy > best) {
      best = st.busy
      cand = i
    }
  }

  // Two stations are often within noise of each other; require a clear win.
  if (cand !== s.bottleneck && best > (s.stations[s.bottleneck] as Station).busy + BN_MARGIN) {
    s.bottleneck = cand
  }

  s.t += dt
  s.rate += (s.completedStep - s.rate * dt) / TAU_RATE

  s.sparkClock += dt
  if (s.sparkClock >= SPARK_EVERY) {
    s.sparkClock = 0
    s.spark.push(s.rate * 3600)
    if (s.spark.length > SPARK_MAX) s.spark.shift()
  }
}

/* --------------------------------- view helpers --------------------- */

interface Snapshot {
  rate: number
  lead: number
  wip: number
  lineUtil: number
  bottleneck: number
  util: number[]
  /** Busy + blocked, so the two can be drawn as one stacked bar. */
  held: number[]
  spark: number[]
  completed: number
  t: number
}

const EMPTY_SNAPSHOT: Snapshot = {
  rate: 0,
  lead: 0,
  wip: 0,
  lineUtil: 0,
  bottleneck: 0,
  util: new Array<number>(N).fill(0),
  held: new Array<number>(N).fill(0),
  spark: [],
  completed: 0,
  t: 0,
}

function readSnapshot(s: SimState): Snapshot {
  const util: number[] = []
  const held: number[] = []
  let sum = 0
  for (let i = 0; i < N; i++) {
    const st = s.stations[i] as Station
    util.push(st.busy)
    held.push(Math.min(1, st.busy + st.blocked))
    sum += st.busy
  }
  return {
    rate: s.rate * 3600,
    lead: s.lead / 60,
    wip: wipOf(s),
    lineUtil: sum / N,
    bottleneck: s.bottleneck,
    util,
    held,
    spark: s.spark.slice(),
    completed: s.completed,
    t: s.t,
  }
}

const fmt1 = (n: number) => n.toFixed(1)
const fmt0 = (n: number) => Math.round(n).toString()
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`

function variantFill(v: number): string {
  return v < VARIANT_SHADES.length ? (VARIANT_SHADES[v] as string) : PAPER
}

function variantStroke(v: number): string {
  return VARIANT_SHADES[v % VARIANT_SHADES.length] as string
}

/** Spring-smoothed readout written straight to the DOM — no re-render churn. */
function SmoothNumber({
  value,
  format,
  reduced,
}: {
  value: number
  format: (n: number) => string
  reduced: boolean
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const spring = useSpring(value, { stiffness: 130, damping: 26, mass: 0.6 })

  useEffect(() => {
    if (reduced) {
      if (ref.current !== null) ref.current.textContent = format(value)
      return
    }
    spring.set(value)
  }, [spring, value, reduced, format])

  useEffect(() => {
    if (ref.current !== null) ref.current.textContent = format(spring.get())
    return spring.on('change', (v: number) => {
      if (ref.current !== null) ref.current.textContent = format(v)
    })
  }, [spring, format])

  return <span ref={ref} />
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) {
    return <div className="h-7 w-full border border-line bg-paper" aria-hidden="true" />
  }
  const hi = Math.max(...points) * 1.12 || 1
  const w = 120
  const h = 28
  const d = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * w
      const y = h - Math.max(0, Math.min(1, v / hi)) * (h - 3) - 1.5
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-7 w-full border border-line bg-paper"
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke={SIGNAL} strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/* --------------------------------- component ------------------------ */

export function LineSim() {
  const reduced = usePrefersReducedMotion()

  // Under reduced motion the line does not auto-play; the visitor drives it.
  const [running, setRunning] = useState(!reduced)
  const [speed, setSpeed] = useState(1)
  const [operators, setOperators] = useState(9)
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('proliferated')
  const [cols, setCols] = useState(9)
  const [snap, setSnap] = useState<Snapshot>(EMPTY_SNAPSHOT)
  const [live, setLive] = useState('Simulation idle.')

  const scenario = SCENARIOS[scenarioKey]
  const layout = useMemo(() => buildLayout(cols), [cols])
  const alloc = useMemo(() => allocate(operators), [operators])
  const cycles = useMemo(
    () => alloc.map((o, i) => effCycleOf(SPECS[i] as StationSpec, o)),
    [alloc],
  )

  const simRef = useRef<SimState | null>(null)
  const layoutRef = useRef(layout)
  const runningRef = useRef(!reduced)
  const speedRef = useRef(1)
  const operatorsRef = useRef(9)
  const scenarioRef = useRef(scenario)
  const reducedRef = useRef(reduced)
  const visibleRef = useRef(true)

  const rootRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const nodesRef = useRef<{
    unit: SVGGElement[]
    mark: SVGRectElement[]
    prog: SVGLineElement[]
    phase: SVGTextElement[]
    slot: SVGRectElement[]
  }>({ unit: [], mark: [], prog: [], phase: [], slot: [] })

  const cacheRef = useRef<{ mark: string[]; phase: string[]; slot: string[] }>({
    mark: [],
    phase: [],
    slot: [],
  })

  useEffect(() => {
    layoutRef.current = layout
  }, [layout])
  useEffect(() => {
    scenarioRef.current = scenario
  }, [scenario])
  useEffect(() => {
    reducedRef.current = reduced
  }, [reduced])

  /* ---- direct SVG writes: the part-flow animation -------------------- */

  const paint = useCallback(() => {
    const sim = simRef.current
    const lay = layoutRef.current
    const nodes = nodesRef.current
    const cache = cacheRef.current
    if (sim === null || nodes.unit.length < N) return

    for (let i = 0; i < N; i++) {
      const st = sim.stations[i] as Station
      const box = lay.boxes[i] as Box
      const g = nodes.unit[i]
      const mark = nodes.mark[i]
      const prog = nodes.prog[i]
      const phase = nodes.phase[i]
      const u = st.current

      if (g !== undefined) {
        if (u === null) {
          g.setAttribute('opacity', '0')
        } else {
          const raw = st.setupLeft > 0 ? 0 : 1 - st.workLeft / st.workTotal
          const p = Math.max(0, Math.min(1, raw))
          const along = box.flip ? 1 - p : p
          const x = box.x + LANE_X0 + along * LANE_W
          g.setAttribute('transform', `translate(${x.toFixed(1)} ${box.y + LANE_Y})`)
          g.setAttribute('opacity', '1')
        }
      }

      if (mark !== undefined) {
        const key = u === null ? '' : `${u.variant}`
        if (cache.mark[i] !== key) {
          cache.mark[i] = key
          if (u !== null) {
            mark.setAttribute('fill', variantFill(u.variant))
            mark.setAttribute('stroke', variantStroke(u.variant))
          }
        }
      }

      if (prog !== undefined) {
        const raw = st.setupLeft > 0 ? 0 : 1 - st.workLeft / st.workTotal
        const p = u === null ? 0 : Math.max(0, Math.min(1, raw))
        prog.setAttribute('x2', (box.x + 7 + p * (SW - 14)).toFixed(1))
      }

      if (phase !== undefined && cache.phase[i] !== st.phase) {
        cache.phase[i] = st.phase
        phase.textContent = PHASE_TEXT[st.phase]
        phase.setAttribute('fill', PHASE_FILL[st.phase])
      }
    }

    for (let gi = 0; gi < N - 1; gi++) {
      const q = (sim.stations[gi + 1] as Station).queue
      for (let j = 0; j < BUFFER_CAP; j++) {
        const idx = gi * BUFFER_CAP + j
        const rect = nodes.slot[idx]
        if (rect === undefined) continue
        const u = q[j]
        const key = u === undefined ? '' : `${u.variant}`
        if (cache.slot[idx] === key) continue
        cache.slot[idx] = key
        if (u === undefined) {
          rect.setAttribute('fill', 'none')
          rect.setAttribute('stroke', LINE)
        } else {
          rect.setAttribute('fill', variantFill(u.variant))
          rect.setAttribute('stroke', variantStroke(u.variant))
        }
      }
    }
  }, [])

  const publish = useCallback(() => {
    const sim = simRef.current
    if (sim === null) return
    setSnap(readSnapshot(sim))
  }, [])

  const announce = useCallback(() => {
    const sim = simRef.current
    if (sim === null) return
    const s = readSnapshot(sim)
    const name = (SPECS[s.bottleneck] as StationSpec).name
    const bnPct = ((s.util[s.bottleneck] ?? 0) * 100).toFixed(0)
    setLive(
      `Throughput ${s.rate.toFixed(1)} units per hour. Average lead time ${s.lead.toFixed(1)} minutes. ` +
        `Work in process ${s.wip} units. Bottleneck at ${name}, ${bnPct} percent busy. ` +
        `Line utilisation ${(s.lineUtil * 100).toFixed(0)} percent.`,
    )
  }, [])

  /* ---- collect the nodes we write to by hand ------------------------- */

  useEffect(() => {
    const root = svgRef.current
    if (root === null) return
    nodesRef.current = {
      unit: Array.from(root.querySelectorAll<SVGGElement>('[data-sim="unit"]')),
      mark: Array.from(root.querySelectorAll<SVGRectElement>('[data-sim="mark"]')),
      prog: Array.from(root.querySelectorAll<SVGLineElement>('[data-sim="prog"]')),
      phase: Array.from(root.querySelectorAll<SVGTextElement>('[data-sim="phase"]')),
      slot: Array.from(root.querySelectorAll<SVGRectElement>('[data-sim="slot"]')),
    }
    cacheRef.current = { mark: [], phase: [], slot: [] }
    paint()
  }, [layout, paint])

  /* ---- reset ---------------------------------------------------------- */

  const reset = useCallback(() => {
    const sim = createSim(operatorsRef.current)
    simRef.current = sim
    const warm = reducedRef.current ? WARMUP_STATIC : WARMUP
    const steps = Math.round(warm / DT)
    for (let i = 0; i < steps; i++) stepSim(sim, scenarioRef.current, DT)
    cacheRef.current = { mark: [], phase: [], slot: [] }
    paint()
    publish()
    announce()
  }, [paint, publish, announce])

  useEffect(() => {
    reset()
  }, [reset])

  /* ---- live parameter changes (no reset, so metrics glide) ------------ */

  useEffect(() => {
    const sim = simRef.current
    if (sim === null) return
    for (let i = 0; i < N; i++) {
      const st = sim.stations[i] as Station
      st.ops = alloc[i] as number
      st.effCycle = cycles[i] as number
    }
  }, [alloc, cycles])

  /* ---- responsive serpentine ----------------------------------------- */

  useEffect(() => {
    const el = frameRef.current
    if (el === null) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      if (w === 0) return
      setCols(w >= 900 ? 9 : w >= 560 ? 5 : 3)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* ---- do not burn CPU off-screen ------------------------------------ */

  useEffect(() => {
    const el = rootRef.current
    if (el === null) return
    const io = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[0]?.isIntersecting ?? true
      },
      { rootMargin: '120px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  /* ---- the loop: fixed timestep off an accumulator -------------------- */

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    let publishAcc = 0
    let liveAcc = 0

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dtReal = Math.min(0.25, (now - last) / 1000)
      last = now
      const sim = simRef.current
      if (sim === null) return
      if (!runningRef.current || !visibleRef.current) {
        acc = 0
        return
      }

      acc += dtReal * BASE_RATE * speedRef.current
      let steps = 0
      while (acc >= DT && steps < 2400) {
        stepSim(sim, scenarioRef.current, DT)
        acc -= DT
        steps += 1
      }
      if (steps >= 2400) acc = 0

      paint()

      publishAcc += dtReal
      if (publishAcc >= PUBLISH_INTERVAL) {
        publishAcc = 0
        publish()
      }
      liveAcc += dtReal
      if (liveAcc >= LIVE_INTERVAL) {
        liveAcc = 0
        announce()
      }
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [paint, publish, announce])

  /* ---- handlers ------------------------------------------------------- */

  const toggleRun = useCallback(() => {
    setRunning((r) => {
      runningRef.current = !r
      return !r
    })
  }, [])

  const stepOnce = useCallback(() => {
    const sim = simRef.current
    if (sim === null) return
    const steps = Math.round(90 / DT)
    for (let i = 0; i < steps; i++) stepSim(sim, scenarioRef.current, DT)
    paint()
    publish()
    announce()
  }, [paint, publish, announce])

  const pickSpeed = useCallback((v: number) => {
    setSpeed(v)
    speedRef.current = v
  }, [])

  const pickScenario = useCallback((k: ScenarioKey) => {
    setScenarioKey(k)
    scenarioRef.current = SCENARIOS[k]
  }, [])

  const onOperators = useCallback((v: number) => {
    setOperators(v)
    operatorsRef.current = v
  }, [])

  /* ---- derived view values -------------------------------------------- */

  const bnName = (SPECS[snap.bottleneck] as StationSpec).name
  const svgLabel =
    `Plant layout of a nine-station breaker assembly line. Throughput ${snap.rate.toFixed(1)} units per hour, ` +
    `${snap.wip} units in process, bottleneck at ${bnName}.`

  const metrics: { label: string; value: number; format: (n: number) => string; unit: string }[] = [
    { label: 'Throughput', value: snap.rate, format: fmt1, unit: 'u/hr' },
    { label: 'Avg lead time', value: snap.lead, format: fmt1, unit: 'min' },
    { label: 'Total WIP', value: snap.wip, format: fmt0, unit: 'units' },
    { label: 'Line utilisation', value: snap.lineUtil, format: fmtPct, unit: '' },
  ]

  const bnBox = layout.boxes[snap.bottleneck] as Box
  const barTransition = reduced
    ? { duration: 0 }
    : { duration: 0.24, ease: [0.65, 0, 0.35, 1] as const }

  return (
    <section
      ref={rootRef}
      className="relative w-full border border-line bg-card reg-marks"
      aria-label="Assembly line simulation"
    >
      {/* ---------------- title block ---------------- */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="label">Fig. 01 · Discrete-event line model · MIT × GE Vernova</p>
          <h3 className="mt-1.5 text-lg leading-tight sm:text-xl">
            Nine-station low-voltage breaker line
          </h3>
          <p className="mt-1 max-w-md text-sm leading-snug text-ink-muted">{scenario.blurb}</p>
        </div>

        <div
          className="flex shrink-0 divide-x divide-line border border-line"
          role="group"
          aria-label="Product scenario"
        >
          {(['proliferated', 'standardized'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => pickScenario(k)}
              aria-pressed={scenarioKey === k}
              className={`px-3 py-2 font-mono text-[0.6875rem] font-medium tracking-[0.1em] uppercase transition-colors duration-200 ${
                scenarioKey === k
                  ? 'bg-ink text-paper'
                  : 'bg-card text-ink-muted hover:bg-paper-deep hover:text-ink'
              }`}
            >
              {SCENARIOS[k].label}
            </button>
          ))}
        </div>
      </header>

      {/* ---------------- metrics strip ---------------- */}
      <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {metrics.map((m) => (
          <div key={m.label} className="bg-card px-4 py-3">
            <p className="label">{m.label}</p>
            <p className="mt-1 font-mono text-xl leading-none tnum text-ink">
              <SmoothNumber value={m.value} format={m.format} reduced={reduced} />
              {m.unit !== '' && (
                <span className="ml-1 align-baseline text-[0.6875rem] text-ink-faint">{m.unit}</span>
              )}
            </p>
          </div>
        ))}

        <div className="bg-card px-4 py-3">
          <p className="label">Bottleneck</p>
          <motion.p
            key={bnName}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="mt-1 font-mono text-sm leading-tight tracking-tight text-signal"
          >
            {bnName}
          </motion.p>
          <p className="mt-0.5 font-mono text-[0.6875rem] tnum text-ink-faint">
            {(SPECS[snap.bottleneck] as StationSpec).code} ·{' '}
            {((snap.util[snap.bottleneck] ?? 0) * 100).toFixed(0)}% busy
          </p>
        </div>

        <div className="bg-card px-4 py-3">
          <p className="label">Throughput · rolling</p>
          <div className="mt-1.5">
            <Sparkline points={snap.spark} />
          </div>
        </div>
      </div>

      {/* ---------------- plant layout ---------------- */}
      <div ref={frameRef} className="relative overflow-hidden border-b border-line bg-paper bp-grid">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${layout.w} ${layout.h}`}
          className="block h-auto w-full"
          role="img"
          aria-label={svgLabel}
        >
          {/* inlet / outlet stubs */}
          <path d={layout.inlet} fill="none" stroke={LINE_STRONG} strokeWidth={1} strokeDasharray="3 3" />
          <path d={layout.outlet} fill="none" stroke={LINE_STRONG} strokeWidth={1} strokeDasharray="3 3" />

          {/* conveyors + inter-station buffers */}
          {layout.gaps.map((gap, gi) => (
            <g key={`gap-${gi}`}>
              <path d={gap.path} fill="none" stroke={LINE_STRONG} strokeWidth={1} />
              <path
                d="M -3.2 -3.2 L 0 0 L -3.2 3.2"
                fill="none"
                stroke={LINE_STRONG}
                strokeWidth={1}
                transform={`translate(${gap.arrow.x} ${gap.arrow.y}) rotate(${gap.arrow.rot})`}
              />
              {gap.slots.map((slot, j) => (
                <rect
                  key={`slot-${gi}-${j}`}
                  data-sim="slot"
                  x={slot.x - 3.5}
                  y={slot.y - 3.5}
                  width={7}
                  height={7}
                  fill="none"
                  stroke={LINE}
                  strokeWidth={1}
                />
              ))}
            </g>
          ))}

          {/* stations */}
          {layout.boxes.map((box, i) => {
            const spec = SPECS[i] as StationSpec
            const isBn = snap.bottleneck === i
            return (
              <g key={spec.code}>
                <rect
                  x={box.x}
                  y={box.y}
                  width={SW}
                  height={SH}
                  fill={isBn ? SIGNAL_WASH : CARD}
                  stroke={isBn ? SIGNAL : LINE_STRONG}
                  strokeWidth={isBn ? 1.6 : 1}
                />
                <text
                  x={box.x + 7}
                  y={box.y + 14}
                  className="font-mono"
                  fontSize={10}
                  fill={isBn ? SIGNAL : INK_MUTED}
                  letterSpacing="0.08em"
                >
                  {spec.code}
                </text>
                <text
                  data-sim="phase"
                  x={box.x + SW - 7}
                  y={box.y + 14}
                  className="font-mono"
                  fontSize={9}
                  textAnchor="end"
                  fill={INK_FAINT}
                  letterSpacing="0.06em"
                />

                {/* work lane */}
                <line
                  x1={box.x + LANE_X0}
                  y1={box.y + LANE_Y}
                  x2={box.x + LANE_X0 + LANE_W}
                  y2={box.y + LANE_Y}
                  stroke={LINE}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                />
                <g data-sim="unit" opacity={0}>
                  <rect data-sim="mark" x={-4.5} y={-4.5} width={9} height={9} fill={INK} stroke={INK} strokeWidth={1} />
                </g>

                {/* cycle progress */}
                <line
                  x1={box.x + 7}
                  y1={box.y + SH - 9}
                  x2={box.x + SW - 7}
                  y2={box.y + SH - 9}
                  stroke={LINE}
                  strokeWidth={1}
                />
                <line
                  data-sim="prog"
                  x1={box.x + 7}
                  y1={box.y + SH - 9}
                  x2={box.x + 7}
                  y2={box.y + SH - 9}
                  stroke={isBn ? SIGNAL : INK}
                  strokeWidth={1.75}
                />
                <text
                  x={box.x + 7}
                  y={box.y + SH - 15}
                  className="font-mono tnum"
                  fontSize={9}
                  fill={INK_SOFT}
                >
                  {(cycles[i] as number).toFixed(0)}s
                </text>
                <text
                  x={box.x + SW - 7}
                  y={box.y + SH - 15}
                  className="font-mono tnum"
                  fontSize={9}
                  textAnchor="end"
                  fill={INK_FAINT}
                >
                  {(alloc[i] as number).toFixed(1)}op
                </text>
              </g>
            )
          })}

          <AnimatePresence initial={false}>
            <motion.g
              key={snap.bottleneck}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <text
                x={bnBox.x + SW / 2}
                y={bnBox.y - 6}
                className="font-mono"
                fontSize={8.5}
                textAnchor="middle"
                fill={SIGNAL}
                letterSpacing="0.14em"
              >
                BOTTLENECK
              </text>
            </motion.g>
          </AnimatePresence>
        </svg>
      </div>

      {/* ---------------- legend ---------------- */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-4 py-2.5 sm:px-6">
        <p className="label flex items-center gap-1.5">
          <span>Variants in play</span>
          <motion.span
            key={scenarioKey}
            className="flex items-center gap-1"
            initial={reduced ? false : { opacity: 0, scaleX: 0.8 }}
            animate={{ opacity: 1, scaleX: 1 }}
            style={{ transformOrigin: 'left center' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {Array.from({ length: scenario.variants }, (_, v) => (
              <span
                key={v}
                className="inline-block h-2.5 w-2.5 border"
                style={{ backgroundColor: variantFill(v), borderColor: variantStroke(v) }}
              />
            ))}
          </motion.span>
          <span className="tnum">· {scenario.variants}</span>
        </p>
        <p className="label flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 border border-line bg-paper" />
          <span>Empty buffer slot · cap {BUFFER_CAP}</span>
        </p>
        <p className="label">
          Station state · <span className="text-ink-soft">RUN</span> ·{' '}
          <span className="text-signal">C/O changeover</span> ·{' '}
          <span className="text-ink-faint">BLK blocked · STV starved</span>
        </p>
      </div>

      {/* ---------------- per-station utilisation ---------------- */}
      <div className="border-b border-line px-4 py-4 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <p className="label">Station utilisation · busy fraction</p>
          <p className="label">
            <span className="inline-block h-2 w-2 translate-y-[1px] bg-ink" /> busy{' '}
            <span className="ml-2 inline-block h-2 w-2 translate-y-[1px] bg-line-strong" /> blocked
          </p>
        </div>

        <ol className="mt-3">
          {SPECS.map((spec, i) => {
            const util = Math.max(0, Math.min(1, snap.util[i] ?? 0))
            const held = Math.max(util, Math.min(1, snap.held[i] ?? 0))
            const isBn = snap.bottleneck === i
            return (
              <li
                key={spec.code}
                className="flex items-center gap-2 border-t border-line py-1.5 sm:gap-3"
              >
                <span
                  className={`w-11 shrink-0 font-mono text-[0.6875rem] tracking-[0.06em] ${
                    isBn ? 'text-signal' : 'text-ink-faint'
                  }`}
                >
                  {spec.code}
                </span>
                <span
                  className={`min-w-0 flex-1 truncate text-xs sm:text-sm ${
                    isBn ? 'text-signal' : 'text-ink-soft'
                  }`}
                >
                  {spec.name}
                </span>
                <span className="hidden w-14 shrink-0 text-right font-mono text-[0.6875rem] tnum text-ink-faint sm:block">
                  {(cycles[i] as number).toFixed(1)}s
                </span>
                <span className="hidden w-10 shrink-0 text-right font-mono text-[0.6875rem] tnum text-ink-faint sm:block">
                  {(alloc[i] as number).toFixed(1)}
                </span>
                <div className="relative h-2.5 w-[34%] shrink-0 border border-line bg-paper sm:w-[38%]">
                  {/* busy + blocked drawn behind, busy on top: a stacked bar with no reflow */}
                  <motion.div
                    className="absolute inset-y-0 left-0 w-full bg-line-strong"
                    style={{ transformOrigin: 'left center' }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: held }}
                    transition={barTransition}
                  />
                  <motion.div
                    className={`absolute inset-y-0 left-0 w-full ${isBn ? 'bg-signal' : 'bg-ink'}`}
                    style={{ transformOrigin: 'left center' }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: util }}
                    transition={barTransition}
                  />
                </div>
                <span
                  className={`w-11 shrink-0 text-right font-mono text-[0.6875rem] tnum ${
                    isBn ? 'text-signal' : 'text-ink-muted'
                  }`}
                >
                  {(util * 100).toFixed(0)}%
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      {/* ---------------- controls ---------------- */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleRun}
            className="border border-ink bg-ink px-4 py-2 font-mono text-[0.6875rem] font-medium tracking-[0.1em] text-paper uppercase transition-colors duration-200 hover:bg-ink-soft"
          >
            {running ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={stepOnce}
            className="border border-line px-3 py-2 font-mono text-[0.6875rem] font-medium tracking-[0.1em] text-ink-muted uppercase transition-colors duration-200 hover:bg-paper-deep hover:text-ink"
          >
            Step +90s
          </button>
          <button
            type="button"
            onClick={reset}
            className="border border-line px-3 py-2 font-mono text-[0.6875rem] font-medium tracking-[0.1em] text-ink-muted uppercase transition-colors duration-200 hover:bg-paper-deep hover:text-ink"
          >
            Reset
          </button>
        </div>

        <div>
          <p className="label mb-1.5">Speed</p>
          <div className="flex divide-x divide-line border border-line" role="group" aria-label="Simulation speed">
            {[1, 4, 16].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => pickSpeed(v)}
                aria-pressed={speed === v}
                className={`px-3 py-1.5 font-mono text-[0.6875rem] font-medium tabular-nums transition-colors duration-200 ${
                  speed === v ? 'bg-ink text-paper' : 'bg-card text-ink-muted hover:bg-paper-deep hover:text-ink'
                }`}
              >
                {v}×
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-[13rem] flex-1">
          <label htmlFor="linesim-operators" className="label mb-1.5 block">
            Operators on shift ·{' '}
            <span className="font-mono text-ink tnum">{operators}</span>
          </label>
          <input
            id="linesim-operators"
            type="range"
            min={6}
            max={12}
            step={1}
            value={operators}
            onChange={(e) => onOperators(Number(e.target.value))}
            className="w-full accent-ink"
          />
          <p className="mt-1 font-mono text-[0.6875rem] leading-tight text-ink-faint">
            Labour is re-balanced onto the slowest station each time; machine-paced stations cap out.
          </p>
        </div>

        <div className="font-mono text-[0.6875rem] tnum text-ink-faint">
          <p>
            SIM CLOCK {(snap.t / 3600).toFixed(2)} h · {snap.completed} units built
          </p>
          <p>SEED 0x{SEED.toString(16)} · Δt {DT.toFixed(2)}s · BUFFER CAP {BUFFER_CAP}</p>
        </div>
      </div>

      {/* ---------------- caption ---------------- */}
      <p className="border-t border-line bg-paper-deep px-4 py-3 text-xs leading-relaxed text-ink-muted sm:px-6">
        Station names, cycle times and changeover penalties are a representative model of a
        nine-station low-voltage breaker line — plausible engineering estimates chosen to make the
        line-balancing behaviour legible. They are not GE Vernova proprietary data, and the numbers
        here are not the validated figures from the study. What is real is the mechanism: a seeded
        discrete-event simulation with finite buffers, blocking, starving and variant changeovers,
        from which the bottleneck emerges rather than being assigned.
      </p>

      <p aria-live="polite" className="sr-only">
        {live}
      </p>
    </section>
  )
}
