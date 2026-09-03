import { useCallback, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import type { Transition } from 'motion/react'
import { usePrefersReducedMotion } from '../../lib/motion'
import { gaussian, mulberry32, polyfit, polyval, r2, rmse, scaleLinear, ticks } from '../../lib/stats'

/* ------------------------------------------------------------------ *
 * Process definition
 *
 * A web travelling through a guided roll-to-roll line relaxes toward the
 * guide-roll setpoint with a characteristic length L:
 *
 *     dy/dx = (K·u(x) − y) / L
 *
 * y is lateral web position (mm), x is machine-direction distance (m), u is
 * the commanded setpoint and L is the distance over which a step is absorbed.
 * ------------------------------------------------------------------ */

const X_MAX = 24
const STEPS = 480
const DX = X_MAX / STEPS
/** Only the first 55 % of the machine direction is observed during training. */
const TRAIN_FRAC = 0.55
const X_SPLIT = X_MAX * TRAIN_FRAC
const SPLIT_INDEX = Math.round(X_SPLIT / DX)
/** Gauge spacing: one lateral-position reading every 0.4 m of machine direction. */
const SAMPLE_EVERY = 8

const TRUE_L = 1.75
const TRUE_K = 1.0
const PROCESS_NOISE = 0.32
const MEASUREMENT_NOISE = 0.14
const SEED = 90210773

/** Commanded guide-roll setpoint: two slow oscillations and two step changes. */
function setpoint(x: number): number {
  return (
    2.6 * Math.sin((2 * Math.PI * x) / 7.5) +
    1.4 * Math.sin((2 * Math.PI * x) / 2.9 + 0.8) +
    (x > 9 ? 1.8 : 0) -
    (x > 17 ? 3.2 : 0)
  )
}

const GRID: number[] = Array.from({ length: STEPS + 1 }, (_, i) => i * DX)
const U: number[] = GRID.map(setpoint)

/**
 * Heun / RK2 integration of the relaxation ODE across the full machine
 * direction. `disturbance` injects the unmodelled process wander that makes
 * the truth something neither model can fit exactly.
 */
function integrate(L: number, K: number, y0: number, disturbance?: number[]): number[] {
  const out: number[] = new Array<number>(STEPS + 1)
  let y = y0
  out[0] = y

  for (let i = 0; i < STEPS; i += 1) {
    const f1 = (K * U[i] - y) / L
    const mid = y + f1 * DX
    const f2 = (K * U[i + 1] - mid) / L
    y += (DX * (f1 + f2)) / 2
    if (disturbance) y += disturbance[i]
    out[i + 1] = y
  }

  return out
}

interface Truth {
  /** Physical web position on the integration grid. */
  y: number[]
  /** Machine-direction position of each measurement. */
  sampleX: number[]
  /** Grid index of each measurement. */
  sampleIndex: number[]
  /** Noisy observed lateral position. */
  sampleY: number[]
  /** Number of leading samples that fall inside the training window. */
  trainCount: number
}

function simulate(): Truth {
  const rand = mulberry32(SEED)

  const disturbance: number[] = new Array<number>(STEPS)
  for (let i = 0; i < STEPS; i += 1) {
    disturbance[i] = PROCESS_NOISE * Math.sqrt(DX) * gaussian(rand)
  }

  const y = integrate(TRUE_L, TRUE_K, U[0] + 0.6, disturbance)

  const sampleX: number[] = []
  const sampleIndex: number[] = []
  const sampleY: number[] = []
  let trainCount = 0

  for (let i = 0; i <= STEPS; i += SAMPLE_EVERY) {
    sampleIndex.push(i)
    sampleX.push(GRID[i])
    sampleY.push(y[i] + MEASUREMENT_NOISE * gaussian(rand))
    if (GRID[i] <= X_SPLIT) trainCount += 1
  }

  return { y, sampleX, sampleIndex, sampleY, trainCount }
}

/* ------------------------------------------------------------------ *
 * Model A, unconstrained polynomial
 * ------------------------------------------------------------------ */

/** Centres and scales x onto [−1, 1] across the training window. */
const X_MID = X_SPLIT / 2
const X_HALF = X_SPLIT / 2
const toPolyX = (x: number): number => (x - X_MID) / X_HALF

interface PolyFit {
  degree: number
  coeffs: number[]
  /** Evaluated on the full integration grid; may contain huge values. */
  curve: number[]
}

function fitPolynomial(truth: Truth, degree: number): PolyFit {
  const xs = truth.sampleX.slice(0, truth.trainCount).map(toPolyX)
  const ys = truth.sampleY.slice(0, truth.trainCount)
  const coeffs = polyfit(xs, ys, degree)
  const curve = GRID.map((x) => polyval(coeffs, toPolyX(x)))
  return { degree, coeffs, curve }
}

/* ------------------------------------------------------------------ *
 * Model B, physics-informed
 *
 * The structure is fixed by the process; only L, the gain K and the initial
 * position are free. Candidates are scanned and the best training RMSE wins.
 * ------------------------------------------------------------------ */

const L_CANDIDATES: number[] = Array.from({ length: 90 }, (_, i) =>
  0.25 * Math.pow(8 / 0.25, i / 89),
)
const K_CANDIDATES: number[] = Array.from({ length: 21 }, (_, i) => 0.85 + (0.3 * i) / 20)

interface PhysicsFit {
  L: number
  K: number
  trainRmse: number
  curve: number[]
}

function fitPhysics(truth: Truth): PhysicsFit {
  const trainIdx = truth.sampleIndex.slice(0, truth.trainCount)
  const trainY = truth.sampleY.slice(0, truth.trainCount)
  const y0 = truth.sampleY[0]

  let best: PhysicsFit = {
    L: TRUE_L,
    K: TRUE_K,
    trainRmse: Number.POSITIVE_INFINITY,
    curve: integrate(TRUE_L, TRUE_K, y0),
  }

  for (const L of L_CANDIDATES) {
    for (const K of K_CANDIDATES) {
      const curve = integrate(L, K, y0)
      const pred = trainIdx.map((i) => curve[i])
      const error = rmse(trainY, pred)
      if (Number.isFinite(error) && error < best.trainRmse) {
        best = { L, K, trainRmse: error, curve }
      }
    }
  }

  return best
}

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

interface Scores {
  inSample: number
  extrapolation: number
  /** True when the fit produced non-finite values anywhere in the domain. */
  diverged: boolean
}

function score(truth: Truth, curve: number[]): Scores {
  const pred = truth.sampleIndex.map((i) => curve[i])
  const inActual = truth.sampleY.slice(0, truth.trainCount)
  const inPred = pred.slice(0, truth.trainCount)
  const outActual = truth.sampleY.slice(truth.trainCount)
  const outPred = pred.slice(truth.trainCount)

  return {
    inSample: r2(inActual, inPred),
    extrapolation: r2(outActual, outPred),
    diverged: !pred.every(Number.isFinite),
  }
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/** R² spans nine orders of magnitude here, so the formatter has to cope. */
function formatR2(v: number): string {
  if (!Number.isFinite(v)) return 'n/a'
  if (v > -10) return v.toFixed(3)
  if (v > -1000) return v.toFixed(0)
  const exponent = Math.floor(Math.log10(Math.abs(v)))
  const mantissa = v / 10 ** exponent
  return `${mantissa.toFixed(1)}e${exponent}`
}

/** Spoken form, so screen readers do not have to parse "−4.2e9". */
function speakR2(v: number): string {
  if (!Number.isFinite(v)) return 'undefined'
  if (v > -10) return v.toFixed(3)
  const exponent = Math.floor(Math.log10(Math.abs(v)))
  return `about minus 10 to the power ${exponent}`
}

interface Point {
  x: number
  y: number
}

/** Builds an SVG path, breaking the pen wherever a value is not finite. */
function buildPath(points: readonly Point[]): string {
  let d = ''
  let pen = false
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)} `
    pen = true
  }
  return d.trim()
}

function useElementWidth(fallback: number): [(node: HTMLDivElement | null) => void, number] {
  const [width, setWidth] = useState(fallback)
  const observer = useRef<ResizeObserver | null>(null)

  const ref = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!node) return
    const measured = node.clientWidth
    if (measured > 0) setWidth(measured)
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(Math.max(1, Math.round(entry.contentRect.width)))
    })
    ro.observe(node)
    observer.current = ro
  }, [])

  return [ref, width]
}

const RANGE_CLASS =
  'h-3.5 w-full cursor-pointer appearance-none bg-transparent ' +
  '[&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-line-strong ' +
  '[&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-[11px] [&::-webkit-slider-thumb]:w-[11px] ' +
  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ink ' +
  '[&::-webkit-slider-thumb]:bg-paper [&:hover::-webkit-slider-thumb]:border-signal ' +
  '[&:hover::-webkit-slider-thumb]:bg-signal ' +
  '[&::-moz-range-track]:h-px [&::-moz-range-track]:bg-line-strong ' +
  '[&::-moz-range-thumb]:h-[11px] [&::-moz-range-thumb]:w-[11px] [&::-moz-range-thumb]:rounded-none ' +
  '[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-paper ' +
  '[&:hover::-moz-range-thumb]:border-signal [&:hover::-moz-range-thumb]:bg-signal'

const POLY_COLOUR = '#e5471b'
const PHYSICS_COLOUR = '#1f5f8b'

interface PanelProps {
  title: string
  meta?: string
  children: ReactNode
}

function Panel({ title, meta, children }: PanelProps) {
  return (
    <section className="flex min-w-0 flex-col bg-card">
      <header className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2.5 sm:px-5">
        <h3 className="label text-ink-soft">{title}</h3>
        {meta ? <span className="label tnum text-ink-faint">{meta}</span> : null}
      </header>
      <div className="min-w-0 flex-1 px-4 py-4 sm:px-5">{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * Chart
 * ------------------------------------------------------------------ */

interface ChartProps {
  truth: Truth
  poly: PolyFit
  physics: PhysicsFit
  transition: Transition
  ariaLabel: string
}

function WebChart({ truth, poly, physics, transition, ariaLabel }: ChartProps) {
  const [ref, width] = useElementWidth(720)
  const clipId = useId().replace(/:/g, '')
  const compact = width < 460

  const height = Math.round(clamp(width * 0.52, 250, 360))
  const m = { top: 20, right: 12, bottom: 32, left: compact ? 40 : 50 }
  const plotW = Math.max(10, width - m.left - m.right)
  const plotH = Math.max(10, height - m.top - m.bottom)

  /* The y window is set by the physics, the truth, the samples and the
     setpoint, never by the polynomial, which is free to leave the frame. */
  const framing = [...truth.y, ...truth.sampleY, ...U, ...physics.curve].filter(Number.isFinite)
  const lo = Math.min(...framing)
  const hi = Math.max(...framing)
  const pad = (hi - lo) * 0.16 || 1
  const yMin = lo - pad
  const yMax = hi + pad

  const x = scaleLinear(0, X_MAX, m.left, m.left + plotW)
  const y = scaleLinear(yMin, yMax, m.top + plotH, m.top)

  const yTicks = ticks(yMin, yMax, 5)
  const xTicks = ticks(0, X_MAX, compact ? 4 : 6)
  const splitX = x(X_SPLIT)

  /* Clamp the polynomial to just outside the frame and let the clip path cut
     it, so a divergent fit reads as "shoots off the chart" rather than
     silently vanishing or blowing up the viewBox. */
  const overshoot = 60
  const polyPoints: Point[] = GRID.map((gx, i) => {
    const v = poly.curve[i]
    if (!Number.isFinite(v)) return { x: NaN, y: NaN }
    return { x: x(gx), y: clamp(y(v), m.top - overshoot, m.top + plotH + overshoot) }
  })

  /* First place past the split where the fit leaves the visible window. */
  let exit: { x: number; above: boolean } | null = null
  for (let i = SPLIT_INDEX; i <= STEPS; i += 1) {
    const v = poly.curve[i]
    if (!Number.isFinite(v) || v > yMax || v < yMin) {
      exit = { x: x(GRID[i]), above: !Number.isFinite(v) ? true : v > yMax }
      break
    }
  }

  const truthPath = buildPath(truth.y.map((v, i) => ({ x: x(GRID[i]), y: y(v) })))
  const setpointPath = buildPath(U.map((v, i) => ({ x: x(GRID[i]), y: y(v) })))
  const physicsPath = buildPath(physics.curve.map((v, i) => ({ x: x(GRID[i]), y: y(v) })))

  return (
    <div ref={ref} className="min-w-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <clipPath id={`plot-${clipId}`}>
            <rect x={m.left} y={m.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Extrapolation region */}
        <rect
          x={splitX}
          y={m.top}
          width={Math.max(0, m.left + plotW - splitX)}
          height={plotH}
          className="fill-paper-deep"
        />

        {/* Hairline gridlines */}
        {yTicks.map((t) => (
          <line
            key={`g${t}`}
            x1={m.left}
            x2={m.left + plotW}
            y1={y(t)}
            y2={y(t)}
            className="stroke-line"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Frame */}
        <line
          x1={m.left}
          x2={m.left}
          y1={m.top}
          y2={m.top + plotH}
          className="stroke-line-strong"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={m.left}
          x2={m.left + plotW}
          y1={m.top + plotH}
          y2={m.top + plotH}
          className="stroke-line-strong"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {/* Train / extrapolate boundary */}
        <line
          x1={splitX}
          x2={splitX}
          y1={m.top - 7}
          y2={m.top + plotH}
          className="stroke-ink-soft"
          strokeWidth={1}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
        <text
          x={splitX - 5}
          y={m.top - 9}
          textAnchor="end"
          className="fill-ink-soft font-mono"
          fontSize={8}
          letterSpacing="0.12em"
        >
          TRAINED HERE
        </text>
        <text
          x={splitX + 5}
          y={m.top - 9}
          className="fill-signal font-mono"
          fontSize={8}
          letterSpacing="0.12em"
        >
          EXTRAPOLATION, NO DATA
        </text>

        <g clipPath={`url(#plot-${clipId})`}>
          {/* Commanded setpoint u(x), a known input, not a prediction */}
          <path
            d={setpointPath}
            fill="none"
            className="stroke-ink-faint"
            strokeWidth={1}
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />

          {/* Physical truth */}
          <path
            d={truthPath}
            fill="none"
            className="stroke-ink"
            strokeWidth={1}
            opacity={0.5}
            vectorEffect="non-scaling-stroke"
          />

          {/* Model A, unconstrained polynomial */}
          <motion.path
            initial={false}
            animate={{ d: buildPath(polyPoints) }}
            transition={transition}
            fill="none"
            stroke={POLY_COLOUR}
            strokeWidth={1.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* Model B, physics-informed */}
          <path
            d={physicsPath}
            fill="none"
            stroke={PHYSICS_COLOUR}
            strokeWidth={1.5}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>

        {/* Observations */}
        {truth.sampleX.map((sx, i) => (
          <circle
            key={`s${i}`}
            cx={x(sx)}
            cy={y(truth.sampleY[i])}
            r={1.5}
            className={i < truth.trainCount ? 'fill-ink' : 'fill-ink-faint'}
          />
        ))}

        {/* Where Model A leaves the frame */}
        {exit ? (
          <g>
            <path
              d={
                exit.above
                  ? `M${exit.x - 4},${m.top + 9} L${exit.x + 4},${m.top + 9} L${exit.x},${m.top + 2} Z`
                  : `M${exit.x - 4},${m.top + plotH - 9} L${exit.x + 4},${m.top + plotH - 9} L${exit.x},${m.top + plotH - 2} Z`
              }
              fill={POLY_COLOUR}
            />
            <text
              x={exit.x + 7}
              y={exit.above ? m.top + 9 : m.top + plotH - 3}
              className="font-mono"
              fill={POLY_COLOUR}
              fontSize={8}
              letterSpacing="0.12em"
            >
              OFF SCALE
            </text>
          </g>
        ) : null}

        {/* Y axis */}
        {yTicks.map((t) => (
          <text
            key={`yt${t}`}
            x={m.left - 6}
            y={y(t) + 3}
            textAnchor="end"
            className="fill-ink-faint font-mono"
            fontSize={9}
          >
            {t.toFixed(0)}
          </text>
        ))}
        <text
          x={m.left - 6}
          y={m.top - 9}
          textAnchor="end"
          className="fill-ink-faint font-mono"
          fontSize={8}
          letterSpacing="0.12em"
        >
          mm
        </text>

        {/* X axis */}
        {xTicks.map((t) => (
          <g key={`xt${t}`}>
            <line
              x1={x(t)}
              x2={x(t)}
              y1={m.top + plotH}
              y2={m.top + plotH + 4}
              className="stroke-line-strong"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={x(t)}
              y={m.top + plotH + 16}
              textAnchor="middle"
              className="fill-ink-faint font-mono"
              fontSize={9}
            >
              {t.toFixed(0)}
            </text>
          </g>
        ))}
        <text
          x={m.left + plotW}
          y={height - 1}
          textAnchor="end"
          className="fill-ink-faint font-mono"
          fontSize={8}
          letterSpacing="0.14em"
        >
          MACHINE DIRECTION (m)
        </text>
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

const MIN_DEGREE = 3
const MAX_DEGREE = 11
const DEFAULT_DEGREE = 9

export function R2RChart() {
  const reduced = usePrefersReducedMotion()
  const idBase = useId()

  const [degree, setDegree] = useState(DEFAULT_DEGREE)

  const truth = useMemo(() => simulate(), [])
  /* The physics fit is a 1 890-point parameter scan, so it is kept out of the
     degree slider's memo and computed exactly once. */
  const physics = useMemo(() => fitPhysics(truth), [truth])
  const poly = useMemo(() => fitPolynomial(truth, degree), [truth, degree])

  const polyScores = useMemo(() => score(truth, poly.curve), [truth, poly])
  const physicsScores = useMemo(() => score(truth, physics.curve), [truth, physics])

  const transition: Transition = reduced
    ? { duration: 0 }
    : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }

  const reset = useCallback(() => setDegree(DEFAULT_DEGREE), [])

  const ariaLabel =
    `Lateral web position against machine direction, with models trained only on the first ` +
    `${Math.round(TRAIN_FRAC * 100)} percent of the line. ` +
    `The degree ${degree} polynomial scores R² ${speakR2(polyScores.inSample)} in sample but ` +
    `${speakR2(polyScores.extrapolation)} in the extrapolation region. ` +
    `The physics-informed model scores R² ${speakR2(physicsScores.inSample)} in sample and ` +
    `${speakR2(physicsScores.extrapolation)} in the extrapolation region, ` +
    `recovering a characteristic length of ${physics.L.toFixed(2)} metres.`

  const rows = [
    {
      key: 'poly',
      name: `Unconstrained polynomial`,
      method: `degree ${degree}, least squares`,
      colour: POLY_COLOUR,
      scores: polyScores,
    },
    {
      key: 'physics',
      name: 'Physics-informed',
      method: 'dy/dx = (K·u − y)/L',
      colour: PHYSICS_COLOUR,
      scores: physicsScores,
    },
  ]

  return (
    <div className="reg-marks relative border border-line bg-card">
      {/* ---- Title block ------------------------------------------- */}
      <header className="bp-grid border-b border-line px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="label">Fig. 06, Extrapolation test</p>
            <h2 className="mt-1.5 text-lg leading-tight text-ink sm:text-xl">
              Lateral web position in a roll-to-roll line
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-muted">
              Both models see the same first{' '}
              <span className="font-mono tnum text-ink-soft">
                {Math.round(TRAIN_FRAC * 100)}
              </span>{' '}
              % of the line. One of them fits it beautifully. Raise the polynomial degree
              and watch what that costs the moment the data stops.
            </p>
          </div>
          <dl className="flex shrink-0 items-end gap-5">
            <div>
              <dt className="label">R² extrapolated</dt>
              <dd className="font-mono tnum text-3xl leading-none text-signal">
                {formatR2(polyScores.extrapolation)}
              </dd>
              <dd className="label mt-1 text-[0.625rem]">polynomial</dd>
            </div>
            <div>
              <dt className="label">R² extrapolated</dt>
              <dd
                className="font-mono tnum text-3xl leading-none"
                style={{ color: PHYSICS_COLOUR }}
              >
                {formatR2(physicsScores.extrapolation)}
              </dd>
              <dd className="label mt-1 text-[0.625rem]">physics-informed</dd>
            </div>
          </dl>
        </div>
      </header>

      {/* ---- Body -------------------------------------------------- */}
      <div className="grid gap-px bg-line lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
        {/* Left column */}
        <div className="grid min-w-0 gap-px bg-line">
          <Panel
            title="Web position y(x)"
            meta={`${truth.trainCount} train · ${truth.sampleX.length - truth.trainCount} unseen`}
          >
            <WebChart
              truth={truth}
              poly={poly}
              physics={physics}
              transition={transition}
              ariaLabel={ariaLabel}
            />
            <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <li className="flex items-center gap-2">
                <svg width={20} height={10} aria-hidden="true" className="shrink-0">
                  <line
                    x1={0}
                    x2={20}
                    y1={5}
                    y2={5}
                    className="stroke-ink"
                    strokeWidth={1}
                    opacity={0.5}
                  />
                </svg>
                <span className="label normal-case tracking-normal text-ink-muted">
                  true web position
                </span>
              </li>
              <li className="flex items-center gap-2">
                <svg width={20} height={10} aria-hidden="true" className="shrink-0">
                  <line
                    x1={0}
                    x2={20}
                    y1={5}
                    y2={5}
                    className="stroke-ink-faint"
                    strokeWidth={1}
                    strokeDasharray="2 3"
                  />
                </svg>
                <span className="label normal-case tracking-normal text-ink-muted">
                  guide setpoint u(x)
                </span>
              </li>
              <li className="flex items-center gap-2">
                <svg width={20} height={10} aria-hidden="true" className="shrink-0">
                  <line x1={0} x2={20} y1={5} y2={5} stroke={POLY_COLOUR} strokeWidth={1.5} />
                </svg>
                <span className="label normal-case tracking-normal text-ink-muted">
                  model A, polynomial
                </span>
              </li>
              <li className="flex items-center gap-2">
                <svg width={20} height={10} aria-hidden="true" className="shrink-0">
                  <line
                    x1={0}
                    x2={20}
                    y1={5}
                    y2={5}
                    stroke={PHYSICS_COLOUR}
                    strokeWidth={1.5}
                  />
                </svg>
                <span className="label normal-case tracking-normal text-ink-muted">
                  model B, physics-informed
                </span>
              </li>
            </ul>
          </Panel>

          <Panel title="Goodness of fit" meta="R², same samples, two regions">
            <div aria-live="polite">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="label pb-2 font-medium">
                      Model
                    </th>
                    <th scope="col" className="label pb-2 text-right font-medium">
                      R² in-sample
                    </th>
                    <th scope="col" className="label pb-2 text-right font-medium text-ink-soft">
                      R² extrapolated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b border-line last:border-0">
                      <th scope="row" className="py-2.5 pr-3 text-left font-normal align-baseline">
                        <span className="flex items-baseline gap-2">
                          <svg
                            width={10}
                            height={10}
                            aria-hidden="true"
                            className="shrink-0 translate-y-[1px]"
                          >
                            <rect x={0} y={3} width={10} height={4} fill={row.colour} />
                          </svg>
                          <span className="min-w-0">
                            <span className="block font-mono text-[0.75rem] text-ink">
                              {row.name}
                            </span>
                            <span className="block text-[0.625rem] leading-tight text-ink-faint">
                              {row.method}
                            </span>
                          </span>
                        </span>
                      </th>
                      <td className="py-2.5 text-right font-mono tnum text-[0.8125rem] text-ink-muted align-baseline">
                        {formatR2(row.scores.inSample)}
                      </td>
                      <td
                        className={`py-2.5 text-right font-mono tnum text-lg leading-none align-baseline sm:text-xl ${
                          row.scores.extrapolation < 0 ? 'text-signal' : 'text-ink'
                        }`}
                      >
                        {formatR2(row.scores.extrapolation)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 border-t border-line pt-3.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
                <p className="label text-ink-soft">Recovered process parameters</p>
                <p className="font-mono text-[0.8125rem] tabular-nums text-ink">
                  L̂ = <span className="text-signal">{physics.L.toFixed(2)}</span> m
                  <span className="text-ink-faint"> · </span>
                  K̂ = {physics.K.toFixed(2)}
                  <span className="text-ink-faint"> · true L = {TRUE_L.toFixed(2)} m</span>
                </p>
              </div>
              <p className="mt-2 text-[0.6875rem] leading-relaxed text-ink-muted">
                That first number is the part a curve fit cannot give you. L̂ is the
                characteristic length over which the web absorbs a guide correction, a
                quantity with units, a physical meaning, and a value you can hand to a
                controls engineer. The polynomial has{' '}
                <span className="font-mono">{degree + 1}</span> coefficients and not one of
                them means anything outside the interval they were fitted on.
              </p>
            </div>
          </Panel>
        </div>

        {/* Right column */}
        <div className="grid min-w-0 auto-rows-min gap-px bg-line">
          <Panel title="Model A, polynomial order" meta={`degree ${degree}`}>
            <div className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={`${idBase}-degree`} className="label truncate text-ink-soft">
                  Polynomial degree
                </label>
                <span className="shrink-0 font-mono text-[0.8125rem] tabular-nums text-ink">
                  {degree}
                </span>
              </div>
              <input
                id={`${idBase}-degree`}
                type="range"
                min={MIN_DEGREE}
                max={MAX_DEGREE}
                step={1}
                value={degree}
                aria-valuetext={`degree ${degree} polynomial, ${degree + 1} coefficients`}
                aria-describedby={`${idBase}-degree-hint`}
                onChange={(ev) => setDegree(Number(ev.target.value))}
                className={RANGE_CLASS}
              />
              <div className="flex items-baseline justify-between gap-2">
                <span
                  id={`${idBase}-degree-hint`}
                  className="min-w-0 text-[0.6875rem] leading-tight text-ink-faint"
                >
                  More terms, tighter in-sample fit
                </span>
                <span className="shrink-0 font-mono text-[0.625rem] tabular-nums text-ink-faint">
                  {MIN_DEGREE}–{MAX_DEGREE}
                </span>
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-t border-line pt-4">
              <dt className="py-1.5 font-mono text-[0.75rem] text-ink-muted">Coefficients</dt>
              <dd className="py-1.5 text-right font-mono tnum text-[0.8125rem] text-ink">
                {degree + 1}
              </dd>
              <dt className="border-t border-line py-1.5 font-mono text-[0.75rem] text-ink-muted">
                Training samples
              </dt>
              <dd className="border-t border-line py-1.5 text-right font-mono tnum text-[0.8125rem] text-ink">
                {truth.trainCount}
              </dd>
              <dt className="border-t border-line py-1.5 font-mono text-[0.75rem] text-ink-muted">
                Free parameters, model B
              </dt>
              <dd className="border-t border-line py-1.5 text-right font-mono tnum text-[0.8125rem] text-ink">
                2
              </dd>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setDegree(MAX_DEGREE)}
                className="label border border-line-strong px-3 py-1.5 text-ink-soft transition-colors duration-150 hover:border-ink hover:bg-ink hover:text-paper"
              >
                Push to degree {MAX_DEGREE}
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={degree === DEFAULT_DEGREE}
                className="label border border-line px-3 py-1.5 text-ink-muted transition-colors duration-150 hover:border-ink-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted"
              >
                Reset
              </button>
            </div>
          </Panel>

          <Panel title="Why the shapes differ" meta="structure vs. flexibility">
            <p className="text-[0.75rem] leading-relaxed text-ink-muted">
              Model A knows only that <span className="font-mono">y</span> is some smooth
              function of <span className="font-mono">x</span>. Given enough terms it starts
              fitting the measurement noise as though it were signal, which is how it
              overtakes the physics on in-sample R². Past the last data point the
              highest-order term takes over and the prediction leaves the building.
            </p>
            <p className="mt-2.5 text-[0.75rem] leading-relaxed text-ink-muted">
              Model B is handed the governing relation and allowed to fit two numbers. It
              also uses the commanded setpoint{' '}
              <span className="font-mono">u(x)</span>, which is a{' '}
              <strong className="font-medium text-ink-soft">known input</strong> on a real
              line rather than something inferred, part of what buying into the physics
              actually gets you. With two free parameters it cannot chase noise, so at high
              polynomial orders it concedes a little in-sample R², and stays admissible
              everywhere.
            </p>
            <p className="mt-2.5 text-[0.75rem] leading-relaxed text-ink-muted">
              For reporting, in-sample R² would pick Model A. For{' '}
              <strong className="font-medium text-ink-soft">control</strong>, where the
              model is asked about states it has never seen, only one of these is usable.
            </p>
          </Panel>
        </div>
      </div>

      {/* ---- Caption ----------------------------------------------- */}
      <footer className="border-t border-line px-4 py-3.5 sm:px-6">
        <p className="max-w-4xl text-[0.75rem] leading-relaxed text-ink-muted">
          <span className="label mr-2 align-baseline">Note</span>
          This figure is a{' '}
          <strong className="font-medium text-ink-soft">
            simulation of web-handling dynamics
          </strong>{' '}
          computed live in the browser, a first-order lateral relaxation ODE integrated
          against a synthetic guide setpoint, with seeded process disturbance and
          measurement noise. It is{' '}
          <strong className="font-medium text-ink-soft">
            not proprietary production data
          </strong>{' '}
          from any manufacturer, and the numbers above are properties of the simulation,
          not results from the engagement. The argument it dramatises is the real one: an
          unconstrained fit optimises the metric you can see and fails at the one you
          cannot, while a model built around the process physics stays physically
          admissible and returns a parameter you can act on.
        </p>
      </footer>
    </div>
  )
}
