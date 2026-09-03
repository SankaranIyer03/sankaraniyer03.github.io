import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { motion } from 'motion/react'
import type { Transition } from 'motion/react'
import { usePrefersReducedMotion } from '../../lib/motion'

/* ------------------------------------------------------------------------- *
 * Machine-vision QC station, simulated.
 *
 * Gauges the bearing bore of an FDM-printed RC-car axle holder against
 * 8.00 ±0.10 mm and stamps a pass/fail verdict. Parts are drawn
 * procedurally as edge maps, there is no camera and no captured imagery.
 * ------------------------------------------------------------------------- */

/* ---- Specification ------------------------------------------------------ */

const NOMINAL_MM = 8
const TOL_MM = 0.1
const LSL_MM = NOMINAL_MM - TOL_MM
const USL_MM = NOMINAL_MM + TOL_MM
const SEED = 0x5eed1a7
const WINDOW = 34

/* ---- Seeded PRNG (mulberry32, explicit state so it stays inspectable) --- */

interface Rng {
  s: number
}

function nextFloat(rng: Rng): number {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0
  let t = rng.s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

/** Box–Muller, one sample per call. */
function nextNormal(rng: Rng): number {
  const u = Math.max(nextFloat(rng), 1e-9)
  const v = nextFloat(rng)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/* ---- Domain types ------------------------------------------------------- */

type Verdict = 'pass' | 'fail'
type Reason = 'in-tolerance' | 'oversize' | 'undersize'

interface Part {
  /** Gauged bore diameter in millimetres, at 0.01 mm gauge resolution. */
  readonly diameter: number
  readonly deviation: number
  readonly verdict: Verdict
  readonly reason: Reason
}

interface Sample {
  readonly seq: number
  readonly diameter: number
  readonly verdict: Verdict
}

type StageId = 'scan' | 'contour' | 'fit' | 'measure' | 'verdict' | 'advance'

interface Stage {
  readonly id: StageId
  readonly code: string
  readonly name: string
  /** Seconds at 1× inspection speed. */
  readonly dur: number
}

/** Slots along the conveyor: [outgoing, in ROI, next, queued]. */
type Slots = [Part | null, Part, Part, Part]

interface RunState {
  rng: Rng
  /** Inspection sequence number of the part currently in the ROI. */
  seq: number
  slots: Slots
  stage: number
  samples: Sample[]
  inspected: number
  passed: number
}

/* ---- Pipeline timeline -------------------------------------------------- */

const STAGES: readonly Stage[] = [
  { id: 'scan', code: '01', name: 'ROI sweep', dur: 0.8 },
  { id: 'contour', code: '02', name: 'Edge extract', dur: 0.5 },
  { id: 'fit', code: '03', name: 'Circle fit', dur: 0.45 },
  { id: 'measure', code: '04', name: 'Gauge bore', dur: 0.6 },
  { id: 'verdict', code: '05', name: 'Verdict', dur: 0.95 },
  { id: 'advance', code: '06', name: 'Index', dur: 0.7 },
]

const I_SCAN = 0
const I_CONTOUR = 1
const I_FIT = 2
const I_MEASURE = 3
const I_VERDICT = 4
const I_ADVANCE = 5

const STAGE_STARTS: readonly number[] = (() => {
  const out: number[] = []
  let t = 0
  for (const stage of STAGES) {
    out.push(t)
    t += stage.dur
  }
  return out
})()

const CYCLE_SECONDS = STAGE_STARTS[I_ADVANCE] + STAGES[I_ADVANCE].dur
const FIXED_DT = 1 / 120

function stageAt(clock: number): number {
  for (let i = STAGES.length - 1; i >= 0; i -= 1) {
    if (clock >= STAGE_STARTS[i]) return i
  }
  return 0
}

function stageProgress(clock: number, index: number): number {
  return clamp((clock - STAGE_STARTS[index]) / STAGES[index].dur, 0, 1)
}

/* ---- Feed geometry (SVG viewBox units) ---------------------------------- */

const FEED_W = 400
const FEED_H = 210
const CX = 200
const CY = 96
const ROI_L = 132
const ROI_R = 268
const ROI_T = 34
const ROI_B = 178
const ROI_W = ROI_R - ROI_L
const ROI_H = ROI_B - ROI_T
const BELT_TOP = 30
const BELT_BOT = 182
const PITCH = 200
const TICK_SPACING = 16

const HALF_W = 55
const HALF_H = 40
const CHAMFER = 10
const BOSS_R = 30
const MM_TO_U = 6
/** Bore deviation is magnified so ±0.10 mm is legible at this scale. */
const DEV_GAIN = 5

const L_DIM_Y = 66

const BODY_PATH = [
  `M ${-HALF_W + CHAMFER} ${-HALF_H}`,
  `L ${HALF_W - CHAMFER} ${-HALF_H}`,
  `L ${HALF_W} ${-HALF_H + CHAMFER}`,
  `L ${HALF_W} ${HALF_H - CHAMFER}`,
  `L ${HALF_W - CHAMFER} ${HALF_H}`,
  `L ${-HALF_W + CHAMFER} ${HALF_H}`,
  `L ${-HALF_W} ${HALF_H - CHAMFER}`,
  `L ${-HALF_W} ${-HALF_H + CHAMFER}`,
  'Z',
].join(' ')

const MOUNT_HOLES: readonly (readonly [number, number])[] = [
  [-38, -28],
  [38, -28],
  [-38, 28],
  [38, 28],
]

/* ---- Strip-chart geometry ----------------------------------------------- */

const CH_W = 400
const CH_H = 132
const PLOT_L = 46
const PLOT_R = 392
const PLOT_T = 14
const PLOT_B = 110
const Y_MIN = 7.7
const Y_MAX = 8.3
const CH_STEP = (PLOT_R - PLOT_L) / (WINDOW - 1)

/* ---- Small maths -------------------------------------------------------- */

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function easeInOutCubic(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
}

function boreRadius(diameter: number): number {
  const shown = NOMINAL_MM + (diameter - NOMINAL_MM) * DEV_GAIN
  return clamp((shown / 2) * MM_TO_U, 17, 28.5)
}

function chartY(diameter: number): number {
  const t = (clamp(diameter, Y_MIN, Y_MAX) - Y_MIN) / (Y_MAX - Y_MIN)
  return PLOT_B - t * (PLOT_B - PLOT_T)
}

function chartX(index: number, length: number): number {
  return PLOT_R - (length - 1 - index) * CH_STEP
}

function signed(value: number): string {
  return `${value < 0 ? '\u2212' : '+'}${Math.abs(value).toFixed(2)}`
}

/* ---- Part generation ---------------------------------------------------- */

function makePart(rng: Rng, defectRate: number): Part {
  let diameter: number
  if (nextFloat(rng) < defectRate) {
    // Out-of-tolerance parts skew undersize: FDM bores close up on cooling.
    const excess = TOL_MM + 0.015 + Math.abs(nextNormal(rng)) * 0.075
    diameter = NOMINAL_MM + (nextFloat(rng) < 0.72 ? -excess : excess)
  } else {
    diameter = NOMINAL_MM + clamp(nextNormal(rng) * 0.038, -0.088, 0.088)
  }
  diameter = Math.round(diameter * 100) / 100
  const reason: Reason =
    diameter > USL_MM ? 'oversize' : diameter < LSL_MM ? 'undersize' : 'in-tolerance'
  return {
    diameter,
    deviation: Math.round((diameter - NOMINAL_MM) * 100) / 100,
    verdict: reason === 'in-tolerance' ? 'pass' : 'fail',
    reason,
  }
}

function createRun(seed: number, defectRate: number): RunState {
  const rng: Rng = { s: seed >>> 0 }
  const slots: Slots = [
    null,
    makePart(rng, defectRate),
    makePart(rng, defectRate),
    makePart(rng, defectRate),
  ]
  return { rng, seq: 1, slots, stage: I_SCAN, samples: [], inspected: 0, passed: 0 }
}

function commit(run: RunState): void {
  const part = run.slots[1]
  const sample: Sample = { seq: run.seq, diameter: part.diameter, verdict: part.verdict }
  run.samples = [...run.samples, sample].slice(-WINDOW)
  run.inspected += 1
  if (part.verdict === 'pass') run.passed += 1
}

function indexOne(run: RunState, defectRate: number): void {
  run.slots = [run.slots[1], run.slots[2], run.slots[3], makePart(run.rng, defectRate)]
  run.seq += 1
}

/* ---- Procedural part drawing -------------------------------------------- */

const RASTER_LINES: readonly number[] = Array.from({ length: 25 }, (_, i) => -96 + i * 8)

/** Detected edge points: deterministic jitter so the fit visibly snaps to them. */
const EDGE_ANGLES: readonly number[] = Array.from(
  { length: 22 },
  (_, i) => (i / 22) * Math.PI * 2,
)
const EDGE_JITTER: readonly number[] = EDGE_ANGLES.map(
  (_, i) => Math.sin(i * 12.9898) * 1.5 + Math.cos(i * 4.1414) * 0.6,
)

function PartFigure({ part, clipId, faint }: { part: Part; clipId: string; faint: boolean }) {
  const r = boreRadius(part.diameter)
  const edge = faint ? 'stroke-ink-faint' : 'stroke-ink-muted'
  return (
    <g>
      <path d={BODY_PATH} className={`fill-card ${edge}`} strokeWidth={faint ? 0.8 : 1.1} />
      <g clipPath={`url(#${clipId})`} className="stroke-ink" strokeWidth={0.5} opacity={0.14}>
        <g transform="rotate(38)">
          {RASTER_LINES.map((x) => (
            <line key={x} x1={x} y1={-96} x2={x} y2={96} />
          ))}
        </g>
      </g>
      {/* Boss around the bearing seat */}
      <circle r={BOSS_R} className={`fill-card ${edge}`} strokeWidth={faint ? 0.7 : 1} />
      <circle r={BOSS_R - 4.5} className={edge} fill="none" strokeWidth={0.55} opacity={0.7} />
      {/* Bearing bore */}
      <circle
        r={r}
        className={`fill-paper-deep ${faint ? 'stroke-ink-faint' : 'stroke-ink'}`}
        strokeWidth={faint ? 0.9 : 1.3}
      />
      {MOUNT_HOLES.map(([hx, hy]) => (
        <circle
          key={`${hx}:${hy}`}
          cx={hx}
          cy={hy}
          r={3.6}
          className={`fill-paper-deep ${edge}`}
          strokeWidth={0.8}
        />
      ))}
      {/* Webs from the boss to the body walls */}
      <g className={edge} strokeWidth={0.6} opacity={0.8}>
        <line x1={-HALF_W} y1={-11} x2={-BOSS_R} y2={-11} />
        <line x1={-HALF_W} y1={11} x2={-BOSS_R} y2={11} />
        <line x1={BOSS_R} y1={-11} x2={HALF_W} y2={-11} />
        <line x1={BOSS_R} y1={11} x2={HALF_W} y2={11} />
      </g>
    </g>
  )
}

/* ---- Component ---------------------------------------------------------- */

export function VisionOverlay() {
  const reduced = usePrefersReducedMotion()
  const rawUid = useId()
  const uid = rawUid.replace(/[^a-zA-Z0-9]/g, '')
  const bodyClip = `${uid}-body`
  const roiClip = `${uid}-roi`

  // `view` is the snapshot React renders; `runRef` is the mutable copy the
  // animation loop advances between snapshots.
  const [view, setView] = useState<RunState>(() => createRun(SEED, 0.08))
  const runRef = useRef<RunState>(view)

  const [playing, setPlaying] = useState(true)
  const [defectRate, setDefectRate] = useState(0.08)
  const [speed, setSpeed] = useState(1)

  const playingRef = useRef(playing)
  const speedRef = useRef(speed)
  const defectRateRef = useRef(defectRate)
  const inViewRef = useRef(true)
  const clockRef = useRef(0)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const beltRef = useRef<SVGGElement | null>(null)
  const ticksRef = useRef<SVGGElement | null>(null)
  const scanRef = useRef<SVGGElement | null>(null)

  const publish = useCallback(() => {
    setView({ ...runRef.current })
  }, [])

  /** Writes the continuous motion straight to the DOM, off the render path. */
  const paint = useCallback(() => {
    const run = runRef.current
    const clock = clockRef.current
    const stage = stageAt(clock)
    const dx =
      stage === I_ADVANCE ? PITCH * easeInOutCubic(stageProgress(clock, I_ADVANCE)) : 0

    beltRef.current?.setAttribute('transform', `translate(${dx.toFixed(2)} 0)`)
    ticksRef.current?.setAttribute(
      'transform',
      `translate(${(dx % TICK_SPACING).toFixed(2)} 0)`,
    )

    const scan = scanRef.current
    if (scan) {
      const live = run.stage === I_SCAN
      scan.setAttribute(
        'transform',
        `translate(${(ROI_W * stageProgress(clock, I_SCAN)).toFixed(2)} 0)`,
      )
      scan.style.opacity = live ? '1' : '0'
    }
  }, [])

  useEffect(() => {
    playingRef.current = playing
  }, [playing])
  useEffect(() => {
    speedRef.current = speed
  }, [speed])
  useEffect(() => {
    defectRateRef.current = defectRate
  }, [defectRate])

  /* Pause the simulation while the widget is scrolled out of view. */
  useEffect(() => {
    const node = rootRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting
      },
      { rootMargin: '96px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  /* Reduced motion: no conveyor, no sweep, one finished inspection, advanced by hand. */
  useEffect(() => {
    if (!reduced) return
    const run = runRef.current
    if (run.inspected > 0) return
    run.stage = I_VERDICT
    commit(run)
    publish()
    paint()
  }, [reduced, publish, paint])

  /* Fixed-timestep cycle clock. */
  useEffect(() => {
    if (reduced) return
    let frame = requestAnimationFrame(tick)
    let last = performance.now()
    let acc = 0

    function step(dt: number): void {
      const run = runRef.current
      clockRef.current += dt
      if (clockRef.current >= CYCLE_SECONDS) {
        clockRef.current -= CYCLE_SECONDS
        indexOne(run, defectRateRef.current)
        run.stage = I_SCAN
        publish()
        return
      }
      const next = stageAt(clockRef.current)
      if (next !== run.stage) {
        run.stage = next
        if (next === I_VERDICT) commit(run)
        publish()
      }
    }

    function tick(now: number): void {
      frame = requestAnimationFrame(tick)
      const elapsed = Math.min((now - last) / 1000, 0.25)
      last = now
      if (!playingRef.current || !inViewRef.current) {
        acc = 0
        return
      }
      acc += elapsed * speedRef.current
      while (acc >= FIXED_DT) {
        acc -= FIXED_DT
        step(FIXED_DT)
      }
      paint()
    }

    return () => cancelAnimationFrame(frame)
  }, [reduced, publish, paint])

  /* Keep the DOM in step after pauses, resets and manual advances. */
  useEffect(() => {
    paint()
  }, [paint, view, playing])

  const onDefectRate = (percent: number) => {
    const rate = percent / 100
    setDefectRate(rate)
    defectRateRef.current = rate
    const run = runRef.current
    // Re-roll the parts not yet inspected so the slider bites on the next cycle.
    run.slots = [run.slots[0], run.slots[1], makePart(run.rng, rate), makePart(run.rng, rate)]
    publish()
  }

  const onReset = () => {
    const run = createRun(SEED, defectRateRef.current)
    runRef.current = run
    clockRef.current = 0
    if (reduced) {
      run.stage = I_VERDICT
      commit(run)
    }
    publish()
  }

  const onInspectNext = () => {
    const run = runRef.current
    indexOne(run, defectRateRef.current)
    run.stage = I_VERDICT
    commit(run)
    publish()
  }

  const { slots, stage, samples, inspected, passed, seq } = view
  const current = slots[1]
  const rejected = inspected - passed
  const alarm = current.verdict === 'fail'
  const measured = stage >= I_MEASURE
  const r = boreRadius(current.diameter)
  const partNo = String(seq).padStart(3, '0')
  const overlayStroke = alarm ? 'stroke-signal' : 'stroke-ink'
  const overlayFill = alarm ? 'fill-signal' : 'fill-ink'

  const feedLabel = measured
    ? `Simulated inspection of part ${seq}: bore diameter measured ${current.diameter.toFixed(2)} millimetres against a nominal 8.00 plus or minus 0.10 millimetres, ${
        current.verdict === 'pass' ? 'pass, in tolerance' : `fail, ${current.reason}`
      }. The part is drawn procedurally as an edge map, not photographed.`
    : `Simulated inspection of part ${seq} in progress: ${STAGES[stage].name}. The part is drawn procedurally as an edge map, not photographed.`

  const anim = (spec: Transition): Transition => (reduced ? { duration: 0 } : spec)
  const from = (spec: Record<string, number>) => (reduced ? false : spec)

  const tally: readonly { label: string; value: string }[] = [
    { label: 'Inspected', value: String(inspected).padStart(3, '0') },
    { label: 'Passed', value: String(passed).padStart(3, '0') },
    { label: 'Rejected', value: String(rejected).padStart(3, '0') },
    {
      label: 'Yield',
      value: inspected > 0 ? `${((passed / inspected) * 100).toFixed(1)}%` : '–',
    },
  ]

  return (
    <div ref={rootRef} className="relative reg-marks border border-line bg-card">
      {/* ---- Title block ------------------------------------------------- */}
      <header className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="label text-ink">Vision QC / Station 01</span>
          <span className="label">Axle holder &mdash; bearing bore</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 ${
              reduced ? 'bg-ink-faint' : playing ? 'bg-ink' : 'border border-line-strong'
            }`}
          />
          <span className="label text-ink">
            {reduced ? 'Manual' : playing ? 'Run' : 'Hold'}
          </span>
        </div>
      </header>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_16rem]">
        {/* ---- Inspection feed ------------------------------------------- */}
        <div className="relative border-b border-line lg:border-b-0 lg:border-r">
          <div className="bp-grid-fine relative bg-paper">
            <svg
              viewBox={`0 0 ${FEED_W} ${FEED_H}`}
              role="img"
              aria-label={feedLabel}
              className="block h-auto w-full"
            >
              <defs>
                <clipPath id={bodyClip}>
                  <path d={BODY_PATH} />
                </clipPath>
                <clipPath id={roiClip}>
                  <rect x={ROI_L} y={ROI_T} width={ROI_W} height={ROI_H} />
                </clipPath>
              </defs>

              {/* Conveyor rails and indexing ticks */}
              <g className="stroke-line-strong" strokeWidth={1}>
                <line x1={0} y1={BELT_TOP} x2={FEED_W} y2={BELT_TOP} />
                <line x1={0} y1={BELT_BOT} x2={FEED_W} y2={BELT_BOT} />
              </g>
              <g ref={ticksRef} className="stroke-line-strong" strokeWidth={1}>
                {Array.from({ length: Math.ceil(FEED_W / TICK_SPACING) + 3 }, (_, i) => {
                  const x = (i - 1) * TICK_SPACING
                  return <line key={i} x1={x} y1={BELT_BOT} x2={x} y2={BELT_BOT - 6} />
                })}
              </g>

              {/* Parts on the belt, plus the detection overlay riding with the one in the ROI */}
              <g ref={beltRef}>
                {slots[0] && (
                  <g transform={`translate(${CX + PITCH} ${CY})`} opacity={0.4}>
                    <PartFigure part={slots[0]} clipId={bodyClip} faint />
                  </g>
                )}
                <g transform={`translate(${CX - PITCH} ${CY})`} opacity={0.4}>
                  <PartFigure part={slots[2]} clipId={bodyClip} faint />
                </g>
                <g transform={`translate(${CX - 2 * PITCH} ${CY})`} opacity={0.28}>
                  <PartFigure part={slots[3]} clipId={bodyClip} faint />
                </g>
                <g transform={`translate(${CX} ${CY})`}>
                  <PartFigure part={current} clipId={bodyClip} faint={false} />
                </g>

                <g transform={`translate(${CX} ${CY})`}>
                  {/* 02, raw edge points along the bore circumference */}
                  {stage >= I_CONTOUR && (
                    <g key={`contour-${seq}`}>
                      {EDGE_ANGLES.map((a, i) => {
                        const rr = r + EDGE_JITTER[i]
                        const c = Math.cos(a)
                        const s = Math.sin(a)
                        return (
                          <motion.line
                            key={i}
                            x1={c * (rr - 2.6)}
                            y1={s * (rr - 2.6)}
                            x2={c * (rr + 2.6)}
                            y2={s * (rr + 2.6)}
                            className="stroke-ink"
                            strokeWidth={1.3}
                            initial={from({ opacity: 0 })}
                            animate={{ opacity: 0.85 }}
                            transition={anim({ duration: 0.16, delay: i * 0.014 })}
                          />
                        )
                      })}
                    </g>
                  )}

                  {/* 03, fitted circle and centre crosshairs */}
                  {stage >= I_FIT && (
                    <motion.g
                      key={`fit-${seq}`}
                      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                      initial={from({ scale: 1.3, opacity: 0 })}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={anim({ type: 'spring', stiffness: 260, damping: 22 })}
                    >
                      <circle r={r} fill="none" className="stroke-ink" strokeWidth={1.5} />
                      <g className="stroke-ink" strokeWidth={0.8}>
                        <line x1={-r - 12} y1={0} x2={r + 12} y2={0} />
                        <line x1={0} y1={-r - 12} x2={0} y2={r + 12} />
                      </g>
                      <circle r={1.6} className="fill-ink" />
                    </motion.g>
                  )}

                  {/* 04, diameter callout */}
                  {stage >= I_MEASURE && (
                    <motion.g
                      key={`dim-${seq}`}
                      initial={from({ opacity: 0, y: -5 })}
                      animate={{ opacity: 1, y: 0 }}
                      transition={anim({ duration: 0.32, ease: [0.16, 1, 0.3, 1] })}
                    >
                      <g className="stroke-ink-faint" strokeWidth={0.6}>
                        <line x1={-r} y1={6} x2={-r} y2={L_DIM_Y + 5} />
                        <line x1={r} y1={6} x2={r} y2={L_DIM_Y + 5} />
                      </g>
                      <g className={overlayStroke} strokeWidth={0.9}>
                        <line x1={-r} y1={L_DIM_Y} x2={r} y2={L_DIM_Y} />
                        <line x1={-r - 4} y1={L_DIM_Y + 4} x2={-r + 4} y2={L_DIM_Y - 4} />
                        <line x1={r - 4} y1={L_DIM_Y + 4} x2={r + 4} y2={L_DIM_Y - 4} />
                      </g>
                      <text
                        x={0}
                        y={L_DIM_Y - 7}
                        textAnchor="middle"
                        fontSize={13}
                        className={`font-mono ${overlayFill}`}
                      >
                        {`\u2300 ${current.diameter.toFixed(2)} mm`}
                      </text>
                    </motion.g>
                  )}

                  {/* 05, verdict stamp */}
                  {stage >= I_VERDICT && (
                    <g key={`stamp-${seq}`} transform="rotate(-3.5 36 -46)">
                      <motion.g
                        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                        initial={from({ scale: 1.55, opacity: 0 })}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={anim({ type: 'spring', stiffness: 420, damping: 24 })}
                      >
                        <rect
                          x={4}
                          y={-60}
                          width={64}
                          height={28}
                          className={
                            alarm ? 'fill-signal-wash stroke-signal' : 'fill-card stroke-ink'
                          }
                          strokeWidth={1.5}
                        />
                        <text
                          x={36}
                          y={-46}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={14}
                          letterSpacing={2.4}
                          className={`font-mono ${alarm ? 'fill-signal' : 'fill-ink'}`}
                        >
                          {alarm ? 'FAIL' : 'PASS'}
                        </text>
                      </motion.g>
                    </g>
                  )}
                </g>
              </g>

              {/* 01, ROI sweep */}
              <g clipPath={`url(#${roiClip})`}>
                <g ref={scanRef} style={{ opacity: 0 }}>
                  <rect
                    x={ROI_L - 22}
                    y={ROI_T}
                    width={22}
                    height={ROI_H}
                    className="fill-signal-wash"
                  />
                  <line
                    x1={ROI_L}
                    y1={ROI_T}
                    x2={ROI_L}
                    y2={ROI_B}
                    className="stroke-signal"
                    strokeWidth={1.2}
                  />
                </g>
              </g>

              {/* ROI brackets and reticle ticks */}
              <g className="stroke-ink" strokeWidth={1.4} fill="none">
                <path d={`M ${ROI_L} ${ROI_T + 15} L ${ROI_L} ${ROI_T} L ${ROI_L + 15} ${ROI_T}`} />
                <path d={`M ${ROI_R - 15} ${ROI_T} L ${ROI_R} ${ROI_T} L ${ROI_R} ${ROI_T + 15}`} />
                <path d={`M ${ROI_R} ${ROI_B - 15} L ${ROI_R} ${ROI_B} L ${ROI_R - 15} ${ROI_B}`} />
                <path d={`M ${ROI_L + 15} ${ROI_B} L ${ROI_L} ${ROI_B} L ${ROI_L} ${ROI_B - 15}`} />
              </g>
              <g className="stroke-line-strong" strokeWidth={1}>
                <line x1={CX} y1={ROI_T} x2={CX} y2={ROI_T + 6} />
                <line x1={CX} y1={ROI_B - 6} x2={CX} y2={ROI_B} />
                <line x1={ROI_L} y1={CY} x2={ROI_L + 6} y2={CY} />
                <line x1={ROI_R - 6} y1={CY} x2={ROI_R} y2={CY} />
              </g>
            </svg>

            <span className="label pointer-events-none absolute left-3 top-2">
              Cam 01 / edge map
            </span>
            <span className="label pointer-events-none absolute right-3 top-2">
              ROI {ROI_W}&times;{ROI_H}
            </span>
            <span className="label pointer-events-none absolute bottom-2 left-3">
              Part {partNo}
            </span>
            <span className="label pointer-events-none absolute bottom-2 right-3">
              Simulated
            </span>
          </div>

          {/* Pipeline stages */}
          <ol className="grid grid-cols-2 border-t border-line sm:grid-cols-3 lg:grid-cols-6">
            {STAGES.map((s, i) => {
              const active = i === stage
              const done = i < stage
              return (
                <li
                  key={s.id}
                  className={`flex items-baseline gap-1.5 border-line border-r px-3 py-2 last:border-r-0 ${
                    active ? 'bg-paper-deep' : ''
                  }`}
                >
                  <span
                    className={`label ${active ? 'text-ink' : done ? 'text-ink-soft' : 'text-ink-faint'}`}
                  >
                    {s.code}
                  </span>
                  <span
                    className={`text-[0.6875rem] leading-tight ${
                      active ? 'text-ink' : done ? 'text-ink-soft' : 'text-ink-faint'
                    }`}
                  >
                    {s.name}
                  </span>
                </li>
              )
            })}
          </ol>
        </div>

        {/* ---- Measurement readout --------------------------------------- */}
        <div className="px-4 py-3 sm:px-5 lg:px-4">
          <span className="label text-ink">Gauge</span>
          <dl className="mt-2">
            {(
              [
                ['Nominal', `${NOMINAL_MM.toFixed(2)} mm`, false],
                ['Upper limit', USL_MM.toFixed(2), false],
                ['Lower limit', LSL_MM.toFixed(2), false],
                ['Measured', measured ? current.diameter.toFixed(2) : '–', alarm],
                ['Deviation', measured ? signed(current.deviation) : '–', alarm],
              ] as readonly [string, string, boolean][]
            ).map(([label, value, hot]) => (
              <div
                key={label}
                className="flex items-baseline justify-between gap-3 border-b border-line py-1.5"
              >
                <dt className="label">{label}</dt>
                <dd
                  className={`tnum font-mono text-sm ${
                    hot && measured ? 'text-signal' : 'text-ink'
                  }`}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="label">Verdict</span>
            {stage >= I_VERDICT ? (
              <span
                className={`border px-2 py-1 font-mono text-xs tracking-[0.18em] uppercase ${
                  alarm
                    ? 'border-signal bg-signal-wash text-signal'
                    : 'border-ink bg-card text-ink'
                }`}
              >
                {alarm ? 'Reject' : 'Accept'}
              </span>
            ) : (
              <span className="border border-line px-2 py-1 font-mono text-xs tracking-[0.18em] text-ink-faint uppercase">
                &mdash;&mdash;
              </span>
            )}
          </div>
          {stage >= I_VERDICT && (
            <p className="mt-2 text-[0.6875rem] leading-snug text-ink-muted">
              {current.reason === 'in-tolerance'
                ? 'Bore within \u00b10.10 mm of nominal.'
                : current.reason === 'undersize'
                  ? 'Bore below lower limit, bearing will not seat.'
                  : 'Bore above upper limit, bearing press-fit lost.'}
            </p>
          )}
        </div>
      </div>

      {/* ---- Strip chart -------------------------------------------------- */}
      <div className="border-t border-line px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="label text-ink">Measured bore &empty; / last {WINDOW} parts</span>
          <span className="label">Spec 8.00 &plusmn;0.10 mm</span>
        </div>
        <svg
          viewBox={`0 0 ${CH_W} ${CH_H}`}
          role="img"
          aria-label={`Strip chart of measured bore diameter for the last ${samples.length} inspected parts against a tolerance band of 7.90 to 8.10 millimetres.`}
          className="mt-2 block h-auto w-full"
        >
          {/* Tolerance band */}
          <rect
            x={PLOT_L}
            y={chartY(USL_MM)}
            width={PLOT_R - PLOT_L}
            height={chartY(LSL_MM) - chartY(USL_MM)}
            className="fill-paper-deep"
          />
          <g className="stroke-line-strong">
            <line
              x1={PLOT_L}
              y1={chartY(USL_MM)}
              x2={PLOT_R}
              y2={chartY(USL_MM)}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <line
              x1={PLOT_L}
              y1={chartY(LSL_MM)}
              x2={PLOT_R}
              y2={chartY(LSL_MM)}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <line
              x1={PLOT_L}
              y1={chartY(NOMINAL_MM)}
              x2={PLOT_R}
              y2={chartY(NOMINAL_MM)}
              strokeWidth={0.7}
              strokeDasharray="1 4"
            />
            <line x1={PLOT_L} y1={PLOT_T} x2={PLOT_L} y2={PLOT_B} strokeWidth={1} />
            <line x1={PLOT_L} y1={PLOT_B} x2={PLOT_R} y2={PLOT_B} strokeWidth={1} />
          </g>
          <g className="font-mono fill-ink-muted" fontSize={10} textAnchor="end">
            <text x={PLOT_L - 6} y={chartY(USL_MM) + 3.5}>
              8.10
            </text>
            <text x={PLOT_L - 6} y={chartY(NOMINAL_MM) + 3.5}>
              8.00
            </text>
            <text x={PLOT_L - 6} y={chartY(LSL_MM) + 3.5}>
              7.90
            </text>
          </g>

          {/* Sample ticks along the index axis */}
          <g className="stroke-line-strong" strokeWidth={0.8}>
            {samples.map((s, i) => {
              const x = chartX(i, samples.length)
              return <line key={s.seq} x1={x} y1={PLOT_B} x2={x} y2={PLOT_B + 3} />
            })}
          </g>

          {samples.length > 1 && (
            <polyline
              points={samples
                .map((s, i) => `${chartX(i, samples.length).toFixed(1)},${chartY(s.diameter).toFixed(1)}`)
                .join(' ')}
              fill="none"
              className="stroke-ink-faint"
              strokeWidth={1}
            />
          )}

          {samples.map((s, i) => {
            const x = chartX(i, samples.length)
            const y = chartY(s.diameter)
            const fail = s.verdict === 'fail'
            const limit = s.diameter > USL_MM ? USL_MM : LSL_MM
            const latest = i === samples.length - 1
            return (
              <g key={s.seq}>
                {fail && (
                  <line
                    x1={x}
                    y1={y}
                    x2={x}
                    y2={chartY(limit)}
                    className="stroke-signal"
                    strokeWidth={1}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={fail ? 3 : 2.2}
                  className={fail ? 'fill-signal' : 'fill-ink'}
                />
                {latest && (
                  <circle
                    cx={x}
                    cy={y}
                    r={6}
                    fill="none"
                    className={fail ? 'stroke-signal' : 'stroke-ink'}
                    strokeWidth={0.9}
                  />
                )}
              </g>
            )
          })}
        </svg>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="label">Older</span>
          <span className="label">Latest</span>
        </div>
      </div>

      {/* ---- Tally -------------------------------------------------------- */}
      <dl aria-live="polite" className="grid grid-cols-2 sm:grid-cols-4">
        {tally.map((cell) => (
          <div
            key={cell.label}
            className="border-line border-t px-4 py-3 odd:border-r sm:border-r-0 sm:border-l sm:px-5 sm:first:border-l-0"
          >
            <dt className="label">{cell.label}</dt>
            <dd
              className={`tnum mt-1 font-mono text-xl leading-none ${
                cell.label === 'Rejected' && rejected > 0 ? 'text-signal' : 'text-ink'
              }`}
            >
              {cell.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* ---- Controls ----------------------------------------------------- */}
      <div className="flex flex-col gap-4 border-t border-line px-4 py-4 sm:px-5 lg:flex-row lg:items-end lg:gap-6">
        <div className="flex items-center gap-2">
          {reduced ? (
            <button
              type="button"
              onClick={onInspectNext}
              className="label border border-ink bg-card px-3 py-2 text-ink hover:bg-paper-deep"
            >
              Inspect next part
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause inspection' : 'Resume inspection'}
              className="label border border-ink bg-card px-3 py-2 text-ink hover:bg-paper-deep"
            >
              {playing ? 'Pause' : 'Play'}
            </button>
          )}
          <button
            type="button"
            onClick={onReset}
            className="label border border-line-strong bg-card px-3 py-2 hover:bg-paper-deep"
          >
            Reset
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <label className="label" htmlFor={`${uid}-defect`}>
              Defect rate
            </label>
            <span className="tnum font-mono text-sm text-ink">
              {Math.round(defectRate * 100)}%
            </span>
          </div>
          <input
            id={`${uid}-defect`}
            type="range"
            min={0}
            max={30}
            step={1}
            value={Math.round(defectRate * 100)}
            onChange={(e) => onDefectRate(Number(e.currentTarget.value))}
            className="accent-signal mt-2 w-full"
          />
          <div className="dim-rule mt-1" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <label className="label" htmlFor={`${uid}-speed`}>
              Inspection speed
            </label>
            <span className="tnum font-mono text-sm text-ink">{speed.toFixed(1)}&times;</span>
          </div>
          <input
            id={`${uid}-speed`}
            type="range"
            min={0.4}
            max={2.6}
            step={0.1}
            value={speed}
            disabled={reduced}
            onChange={(e) => setSpeed(Number(e.currentTarget.value))}
            className="accent-signal mt-2 w-full disabled:opacity-40"
          />
          <div className="dim-rule mt-1" aria-hidden="true" />
        </div>
      </div>

      {/* ---- Caption ------------------------------------------------------ */}
      <p className="border-t border-line px-4 py-3 text-xs leading-relaxed text-ink-muted sm:px-5">
        A simulation of the inspection logic behind a machine-vision QC station I built to
        gauge bearing-bore diameter on a run of 40 FDM-printed RC-car axle holders,
        replacing subjective manual inspection. The parts are drawn procedurally as edge
        maps and the diameters come from a seeded random generator &mdash; this is not a
        live camera feed, captured production imagery or real gauge data. Bore deviation is
        magnified &times;{DEV_GAIN} on screen so &plusmn;0.10&nbsp;mm is visible at this
        scale.
      </p>
    </div>
  )
}
