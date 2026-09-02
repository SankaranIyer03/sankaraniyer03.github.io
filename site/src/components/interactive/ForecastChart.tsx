import { useCallback, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import type { Transition } from 'motion/react'
import { usePrefersReducedMotion } from '../../lib/motion'
import {
  bias,
  gaussian,
  mae,
  mean,
  mulberry32,
  ridge,
  rmse,
  scaleLinear,
  std,
  ticks,
} from '../../lib/stats'

/* ------------------------------------------------------------------ *
 * Series definition
 * ------------------------------------------------------------------ */

const N_MONTHS = 72
const SEASON = 12
const HOLDOUT = 12
/** Index of the first held-out month; everything before it is training data. */
const ORIGIN = N_MONTHS - HOLDOUT
const SEED = 20240517

/**
 * A synthetic service-parts demand series: linear growth on top of an annual
 * cycle and a half-year harmonic, with occasional quiet months. The
 * intermittency is the part that makes real aftermarket parts demand awkward —
 * a textbook seasonal series would flatter every model here.
 */
function buildDemand(): number[] {
  const rand = mulberry32(SEED)
  const out: number[] = new Array<number>(N_MONTHS)

  for (let t = 0; t < N_MONTHS; t += 1) {
    const trend = 430 + 2.9 * t
    const annual = 96 * Math.sin((2 * Math.PI * (t - 3)) / SEASON)
    const harmonic = 31 * Math.sin((4 * Math.PI * (t + 1)) / SEASON)
    const noise = 27 * gaussian(rand)
    const quiet = rand() < 0.08 ? 0.58 : 1
    out[t] = Math.max(0, Math.round((trend + annual + harmonic + noise) * quiet))
  }

  return out
}

/* ------------------------------------------------------------------ *
 * Forecasters
 * ------------------------------------------------------------------ */

/** Last year's value for the same month. The benchmark every model must beat. */
function seasonalNaive(series: number[], horizon: number): number[] {
  return Array.from({ length: horizon }, (_, h) => series[ORIGIN + h - SEASON] ?? 0)
}

interface Smoothing {
  alpha: number
  beta: number
  gamma: number
}

/**
 * Holt–Winters additive: level, trend and seasonal recursions run over the
 * training data, then projected forward. Seasonal indices are initialised from
 * the mean deviation of each complete cycle.
 */
function holtWinters(train: number[], p: Smoothing, horizon: number): number[] {
  const cycles = Math.floor(train.length / SEASON)
  if (cycles < 2) return new Array<number>(horizon).fill(mean(train))

  const cycleMeans: number[] = []
  for (let c = 0; c < cycles; c += 1) {
    cycleMeans.push(mean(train.slice(c * SEASON, (c + 1) * SEASON)))
  }

  const season: number[] = new Array<number>(SEASON).fill(0)
  for (let i = 0; i < SEASON; i += 1) {
    let acc = 0
    for (let c = 0; c < cycles; c += 1) acc += train[c * SEASON + i] - cycleMeans[c]
    season[i] = acc / cycles
  }

  let level = cycleMeans[0]
  let trend = (cycleMeans[cycles - 1] - cycleMeans[0]) / ((cycles - 1) * SEASON)

  for (let t = 0; t < train.length; t += 1) {
    const slot = t % SEASON
    const s = season[slot]
    const prevLevel = level
    level = p.alpha * (train[t] - s) + (1 - p.alpha) * (level + trend)
    trend = p.beta * (level - prevLevel) + (1 - p.beta) * trend
    season[slot] = p.gamma * (train[t] - level) + (1 - p.gamma) * s
  }

  return Array.from(
    { length: horizon },
    (_, h) => level + (h + 1) * trend + season[(train.length + h) % SEASON],
  )
}

/**
 * AR(2) on the first difference, fitted by least squares (ridge with a
 * vanishing penalty is exactly OLS on the normal equations), then iterated
 * forward and re-accumulated to levels. Differencing strips the trend but not
 * the annual cycle, so this one is expected to struggle — that is the point of
 * keeping it in the comparison.
 */
function arTwo(train: number[], horizon: number): number[] {
  const diff: number[] = []
  for (let t = 1; t < train.length; t += 1) diff.push(train[t] - train[t - 1])

  const rows: number[][] = []
  const target: number[] = []
  for (let t = 2; t < diff.length; t += 1) {
    rows.push([1, diff[t - 1], diff[t - 2]])
    target.push(diff[t])
  }

  const c = ridge(rows, target, 1e-8)

  let level = train[train.length - 1]
  let d1 = diff[diff.length - 1]
  let d2 = diff[diff.length - 2]
  const out: number[] = []

  for (let h = 0; h < horizon; h += 1) {
    const step = c[0] + c[1] * d1 + c[2] * d2
    level += step
    out.push(level)
    d2 = d1
    d1 = step
  }

  return out
}

const LAGS = [1, 2, 3, SEASON] as const

/** One feature row: intercept, lagged demand, a time index, and month dummies. */
function lagRow(history: number[], t: number, z: (v: number) => number): number[] {
  const row: number[] = [1]
  for (const lag of LAGS) row.push(z(history[t - lag]))
  row.push(t / N_MONTHS)
  const month = t % SEASON
  for (let k = 1; k < SEASON; k += 1) row.push(month === k ? 1 : 0)
  return row
}

/**
 * A lag-feature regression standing in for the gradient-boosting baseline used
 * on the freight work. It is a ridge fit on engineered lag features, not
 * LightGBM — same feature-engineering idea, honest about the estimator.
 * Forecasts are generated recursively, feeding predictions back in as lags.
 */
function lagRegression(train: number[], horizon: number): number[] {
  const mu = mean(train)
  const sd = std(train) || 1
  const z = (v: number): number => (v - mu) / sd

  const rows: number[][] = []
  const target: number[] = []
  for (let t = SEASON; t < train.length; t += 1) {
    rows.push(lagRow(train, t, z))
    target.push(z(train[t]))
  }

  const w = ridge(rows, target, 0.06)
  const history = [...train]
  const out: number[] = []

  for (let h = 0; h < horizon; h += 1) {
    const t = train.length + h
    const row = lagRow(history, t, z)
    let acc = 0
    for (let i = 0; i < row.length; i += 1) acc += w[i] * row[i]
    const value = acc * sd + mu
    history.push(value)
    out.push(value)
  }

  return out
}

/* ------------------------------------------------------------------ *
 * Model registry
 * ------------------------------------------------------------------ */

type ModelId = 'snaive' | 'hw' | 'ar2' | 'lagreg'

interface ModelSpec {
  id: ModelId
  name: string
  method: string
  /** series-2..series-5; actual demand keeps series-1 (ink) to itself. */
  colour: string
}

const MODELS: readonly ModelSpec[] = [
  { id: 'snaive', name: 'Seasonal naive', method: 'ŷ = y[t−12]', colour: '#8b6f1f' },
  { id: 'hw', name: 'Holt–Winters', method: 'additive level · trend · season', colour: '#e5471b' },
  { id: 'ar2', name: 'AR(2) on Δy', method: 'least squares, differenced', colour: '#2f7a4f' },
  {
    id: 'lagreg',
    name: 'Lag-feature ridge',
    method: 'lags 1,2,3,12 · month dummies',
    colour: '#1f5f8b',
  },
]

interface ModelResult {
  spec: ModelSpec
  forecast: number[]
  rmse: number
  mae: number
  bias: number
}

function evaluate(spec: ModelSpec, forecast: number[], actual: number[]): ModelResult {
  return {
    spec,
    forecast,
    rmse: rmse(actual, forecast),
    mae: mae(actual, forecast),
    bias: bias(actual, forecast),
  }
}

/* ------------------------------------------------------------------ *
 * Smoothing-parameter search
 * ------------------------------------------------------------------ */

const ALPHAS = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.65, 0.8, 0.95]
const BETAS = [0, 0.02, 0.05, 0.1, 0.2, 0.35]
const GAMMAS = [0.05, 0.1, 0.2, 0.35, 0.5, 0.7]

const DEFAULT_SMOOTHING: Smoothing = { alpha: 0.3, beta: 0.05, gamma: 0.35 }

const VALIDATION_FOLDS = 2

/**
 * Grid-searches α, β and γ by rolling-origin cross-validation *inside* the
 * training data: successive twelve-month folds, each scored by a model fitted
 * only on what came before it. Averaging folds matters — tuning against a
 * single fold picks parameters that suit one particular year and generalise
 * worse than the defaults. The holdout is never touched, so the error reported
 * above stays a genuine out-of-sample number rather than a tuned one.
 */
function tuneSmoothing(train: number[]): Smoothing {
  let best = DEFAULT_SMOOTHING
  let bestError = Number.POSITIVE_INFINITY

  for (const alpha of ALPHAS) {
    for (const beta of BETAS) {
      for (const gamma of GAMMAS) {
        const candidate: Smoothing = { alpha, beta, gamma }
        let total = 0
        let usable = true

        for (let fold = VALIDATION_FOLDS; fold >= 1; fold -= 1) {
          const end = train.length - fold * HOLDOUT
          // Every fold must keep three complete cycles to initialise from.
          if (end < 3 * SEASON) {
            usable = false
            break
          }
          const pred = holtWinters(train.slice(0, end), candidate, HOLDOUT)
          if (!pred.every(Number.isFinite)) {
            usable = false
            break
          }
          total += rmse(train.slice(end, end + HOLDOUT), pred)
        }

        const error = total / VALIDATION_FOLDS
        if (usable && error < bestError) {
          bestError = error
          best = candidate
        }
      }
    }
  }

  return best
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

const signed = (v: number): string => `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(1)}`

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

/** Measures the live container width so SVG user units map 1:1 to CSS pixels. */
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
  series: number[]
  results: ModelResult[]
  transition: Transition
  ariaLabel: string
}

function DemandChart({ series, results, transition, ariaLabel }: ChartProps) {
  const [ref, width] = useElementWidth(720)
  const compact = width < 460

  const height = Math.round(clamp(width * 0.5, 240, 340))
  const m = { top: 18, right: 12, bottom: 30, left: compact ? 40 : 50 }
  const plotW = Math.max(10, width - m.left - m.right)
  const plotH = Math.max(10, height - m.top - m.bottom)

  const visible = series.filter(Number.isFinite)
  for (const r of results) {
    for (const v of r.forecast) if (Number.isFinite(v)) visible.push(v)
  }
  const lo = Math.min(...visible)
  const hi = Math.max(...visible)
  const pad = (hi - lo) * 0.1 || 10
  const yMin = Math.max(0, lo - pad)
  const yMax = hi + pad

  const x = scaleLinear(0, N_MONTHS - 1, m.left, m.left + plotW)
  const y = scaleLinear(yMin, yMax, m.top + plotH, m.top)

  const yTicks = ticks(yMin, yMax, 5)
  const xTicks = ticks(0, N_MONTHS - 1, compact ? 4 : 6)

  const originX = x(ORIGIN - 0.5)

  const actualPath = buildPath(series.map((v, t) => ({ x: x(t), y: y(v) })))

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
        {/* Held-out window */}
        <rect
          x={originX}
          y={m.top}
          width={Math.max(0, m.left + plotW - originX)}
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

        {/* Forecast origin */}
        <line
          x1={originX}
          x2={originX}
          y1={m.top - 6}
          y2={m.top + plotH}
          className="stroke-ink-soft"
          strokeWidth={1}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
        <text
          x={originX - 5}
          y={m.top - 8}
          textAnchor="end"
          className="fill-ink-soft font-mono"
          fontSize={8}
          letterSpacing="0.12em"
        >
          FORECAST ORIGIN
        </text>
        <text
          x={originX + 5}
          y={m.top - 8}
          className="fill-ink-faint font-mono"
          fontSize={8}
          letterSpacing="0.12em"
        >
          HOLDOUT · {HOLDOUT} MO
        </text>

        {/* Actual demand — always ink */}
        <path
          d={actualPath}
          fill="none"
          className="stroke-ink"
          strokeWidth={1}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {series.slice(ORIGIN).map((v, i) => (
          <circle key={`a${i}`} cx={x(ORIGIN + i)} cy={y(v)} r={1.8} className="fill-ink" />
        ))}

        {/* Forecasts, anchored at the last observed training point */}
        {results.map((r) => {
          const pts: Point[] = [{ x: x(ORIGIN - 1), y: y(series[ORIGIN - 1]) }]
          r.forecast.forEach((v, i) => pts.push({ x: x(ORIGIN + i), y: y(v) }))
          return (
            <motion.path
              key={r.spec.id}
              initial={false}
              animate={{ d: buildPath(pts) }}
              transition={transition}
              fill="none"
              stroke={r.spec.colour}
              strokeWidth={1.5}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )
        })}

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
            {Math.round(t)}
          </text>
        ))}
        <text
          x={m.left - 6}
          y={m.top - 8}
          textAnchor="end"
          className="fill-ink-faint font-mono"
          fontSize={8}
          letterSpacing="0.12em"
        >
          UNITS
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
              {Math.round(t) + 1}
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
          MONTH
        </text>
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

interface SliderSpec {
  key: keyof Smoothing
  symbol: string
  label: string
  spoken: string
  hint: string
}

const SLIDERS: readonly SliderSpec[] = [
  {
    key: 'alpha',
    symbol: 'α',
    label: 'Level',
    spoken: 'alpha, level smoothing',
    hint: 'How fast the level chases the latest observation',
  },
  {
    key: 'beta',
    symbol: 'β',
    label: 'Trend',
    spoken: 'beta, trend smoothing',
    hint: 'How readily the slope is revised — high β overshoots',
  },
  {
    key: 'gamma',
    symbol: 'γ',
    label: 'Season',
    spoken: 'gamma, seasonal smoothing',
    hint: 'How much each month’s seasonal index updates per cycle',
  },
]

export function ForecastChart() {
  const reduced = usePrefersReducedMotion()
  const idBase = useId()

  const [enabled, setEnabled] = useState<Record<ModelId, boolean>>({
    snaive: true,
    hw: true,
    ar2: false,
    lagreg: true,
  })
  const [smoothing, setSmoothing] = useState<Smoothing>(DEFAULT_SMOOTHING)

  const series = useMemo(() => buildDemand(), [])
  const train = useMemo(() => series.slice(0, ORIGIN), [series])
  const holdout = useMemo(() => series.slice(ORIGIN), [series])

  /** Seasonal naive, AR(2) and the lag regression do not depend on α/β/γ. */
  const staticResults = useMemo(
    () => ({
      snaive: seasonalNaive(series, HOLDOUT),
      ar2: arTwo(train, HOLDOUT),
      lagreg: lagRegression(train, HOLDOUT),
    }),
    [series, train],
  )

  const hwForecast = useMemo(
    () => holtWinters(train, smoothing, HOLDOUT),
    [train, smoothing],
  )

  const allResults = useMemo<ModelResult[]>(() => {
    const byId: Record<ModelId, number[]> = {
      snaive: staticResults.snaive,
      hw: hwForecast,
      ar2: staticResults.ar2,
      lagreg: staticResults.lagreg,
    }
    return MODELS.map((spec) => evaluate(spec, byId[spec.id], holdout))
  }, [staticResults, hwForecast, holdout])

  const shown = useMemo(
    () => allResults.filter((r) => enabled[r.spec.id]),
    [allResults, enabled],
  )

  const best = useMemo(
    () =>
      shown.reduce<ModelResult | null>(
        (acc, r) => (acc === null || r.rmse < acc.rmse ? r : acc),
        null,
      ),
    [shown],
  )

  const transition: Transition = reduced
    ? { duration: 0 }
    : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }

  const toggle = useCallback((id: ModelId) => {
    setEnabled((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const setSmoothingValue = useCallback((key: keyof Smoothing, value: number) => {
    setSmoothing((prev) => ({ ...prev, [key]: value }))
    // Moving a smoothing control implies you want to see its curve.
    setEnabled((prev) => (prev.hw ? prev : { ...prev, hw: true }))
  }, [])

  const autoTune = useCallback(() => {
    setSmoothing(tuneSmoothing(train))
    setEnabled((prev) => (prev.hw ? prev : { ...prev, hw: true }))
  }, [train])

  const resetSmoothing = useCallback(() => setSmoothing(DEFAULT_SMOOTHING), [])

  const tuned =
    smoothing.alpha !== DEFAULT_SMOOTHING.alpha ||
    smoothing.beta !== DEFAULT_SMOOTHING.beta ||
    smoothing.gamma !== DEFAULT_SMOOTHING.gamma

  const ariaLabel =
    `Monthly parts demand over ${N_MONTHS} synthetic months with the final ${HOLDOUT} months held out. ` +
    (best
      ? `Of the ${shown.length} model${shown.length === 1 ? '' : 's'} shown, ${best.spec.name} has ` +
        `the lowest holdout error at RMSE ${best.rmse.toFixed(1)} units, MAE ${best.mae.toFixed(1)}, ` +
        `bias ${best.bias >= 0 ? 'plus' : 'minus'} ${Math.abs(best.bias).toFixed(1)} units.`
      : 'No models are currently shown.')

  return (
    <div className="reg-marks relative border border-line bg-card">
      {/* ---- Title block ------------------------------------------- */}
      <header className="bp-grid border-b border-line px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="label">Fig. 05 — Forecast bake-off</p>
            <h2 className="mt-1.5 text-lg leading-tight text-ink sm:text-xl">
              Service-parts demand, twelve-month horizon
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-muted">
              Four forecasters, one held-out year, scored the way the Deere program scored
              them — on error <em>and</em> on which direction they miss. Turn models on and
              off; move the smoothing constants and watch the error answer.
            </p>
          </div>
          <dl className="flex shrink-0 items-end gap-5">
            <div>
              <dt className="label">Best RMSE</dt>
              <dd className="font-mono tnum text-3xl leading-none text-ink">
                {best ? best.rmse.toFixed(1) : '—'}
              </dd>
            </div>
            <div className="max-w-[9rem]">
              <dt className="label">Leader</dt>
              <dd className="mt-1 font-mono text-[0.8125rem] leading-tight text-ink-soft">
                {best ? best.spec.name : 'none shown'}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {/* ---- Body -------------------------------------------------- */}
      <div className="grid gap-px bg-line lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
        {/* Left column */}
        <div className="grid min-w-0 gap-px bg-line">
          <Panel title="Demand & forecasts" meta={`n = ${N_MONTHS} mo · holdout = ${HOLDOUT}`}>
            <DemandChart
              series={series}
              results={shown}
              transition={transition}
              ariaLabel={ariaLabel}
            />
            <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <li className="flex items-center gap-2">
                <svg width={20} height={10} aria-hidden="true" className="shrink-0">
                  <line x1={0} x2={20} y1={5} y2={5} className="stroke-ink" strokeWidth={1} />
                </svg>
                <span className="label normal-case tracking-normal text-ink-muted">
                  actual demand
                </span>
              </li>
              {shown.map((r) => (
                <li key={r.spec.id} className="flex items-center gap-2">
                  <svg width={20} height={10} aria-hidden="true" className="shrink-0">
                    <line
                      x1={0}
                      x2={20}
                      y1={5}
                      y2={5}
                      stroke={r.spec.colour}
                      strokeWidth={1.5}
                    />
                  </svg>
                  <span className="label normal-case tracking-normal text-ink-muted">
                    {r.spec.name}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Holdout accuracy" meta="scored on 12 unseen months">
            <div aria-live="polite">
              {shown.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-faint">
                  No models selected — enable one to score it.
                </p>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-line">
                      <th scope="col" className="label pb-2 font-medium">
                        Model
                      </th>
                      <th scope="col" className="label pb-2 text-right font-medium">
                        RMSE
                      </th>
                      <th scope="col" className="label pb-2 text-right font-medium">
                        MAE
                      </th>
                      <th scope="col" className="label pb-2 text-right font-medium">
                        Bias
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => {
                      const leader = best !== null && best.spec.id === r.spec.id
                      return (
                        <tr
                          key={r.spec.id}
                          className={`border-b border-line last:border-0 ${
                            leader ? 'bg-signal-wash' : ''
                          }`}
                        >
                          <th
                            scope="row"
                            className="py-2 pr-3 text-left font-normal align-baseline"
                          >
                            <span className="flex items-baseline gap-2">
                              <svg
                                width={10}
                                height={10}
                                aria-hidden="true"
                                className="shrink-0 translate-y-[1px]"
                              >
                                <rect
                                  x={0}
                                  y={3}
                                  width={10}
                                  height={4}
                                  fill={r.spec.colour}
                                />
                              </svg>
                              <span className="min-w-0">
                                <span
                                  className={`block font-mono text-[0.75rem] ${
                                    leader ? 'text-ink' : 'text-ink-soft'
                                  }`}
                                >
                                  {r.spec.name}
                                </span>
                                <span className="block text-[0.625rem] leading-tight text-ink-faint">
                                  {r.spec.method}
                                </span>
                              </span>
                            </span>
                          </th>
                          <td
                            className={`py-2 text-right font-mono tnum text-[0.8125rem] align-baseline ${
                              leader ? 'text-signal' : 'text-ink'
                            }`}
                          >
                            {r.rmse.toFixed(1)}
                          </td>
                          <td className="py-2 text-right font-mono tnum text-[0.8125rem] text-ink-soft align-baseline">
                            {r.mae.toFixed(1)}
                          </td>
                          <td
                            className={`py-2 text-right font-mono tnum text-[0.8125rem] align-baseline ${
                              Math.abs(r.bias) > 25 ? 'text-signal' : 'text-ink-soft'
                            }`}
                          >
                            {signed(r.bias)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <p className="mt-3 border-t border-line pt-3 text-[0.6875rem] leading-relaxed text-ink-muted">
              <span className="label mr-2 align-baseline">Bias</span>
              Signed mean error, in units per month. Positive means the model{' '}
              <strong className="font-medium text-ink-soft">over-predicts</strong> and the
              parts sit on a shelf; negative means it under-predicts and a machine waits. A
              model can win on RMSE and still be the wrong answer if it misses in the
              expensive direction — which is exactly the argument the engineering, business
              and data science students on that team kept having.
            </p>
          </Panel>
        </div>

        {/* Right column */}
        <div className="grid min-w-0 auto-rows-min gap-px bg-line">
          <Panel title="Models" meta={`${shown.length} / ${MODELS.length} shown`}>
            <ul className="grid gap-2">
              {MODELS.map((spec) => {
                const on = enabled[spec.id]
                return (
                  <li key={spec.id}>
                    <button
                      type="button"
                      onClick={() => toggle(spec.id)}
                      aria-pressed={on}
                      className={`flex w-full items-baseline gap-2.5 border px-3 py-2 text-left transition-colors duration-150 ${
                        on
                          ? 'border-line-strong bg-paper-deep'
                          : 'border-line bg-card hover:border-line-strong'
                      }`}
                    >
                      <svg
                        width={12}
                        height={12}
                        aria-hidden="true"
                        className="shrink-0 translate-y-[2px]"
                      >
                        <rect
                          x={0.5}
                          y={0.5}
                          width={11}
                          height={11}
                          fill={on ? spec.colour : 'none'}
                          stroke={on ? spec.colour : '#c2bfb4'}
                          strokeWidth={1}
                        />
                      </svg>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block font-mono text-[0.75rem] ${
                            on ? 'text-ink' : 'text-ink-faint'
                          }`}
                        >
                          {spec.name}
                        </span>
                        <span className="block text-[0.625rem] leading-tight text-ink-faint">
                          {spec.method}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Panel>

          <Panel title="Exponential smoothing" meta={tuned ? 'tuned' : 'default'}>
            <div className="grid gap-4">
              {SLIDERS.map((s) => {
                const id = `${idBase}-${s.key}`
                const value = smoothing[s.key]
                return (
                  <div key={s.key} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <label htmlFor={id} className="label truncate text-ink-soft">
                        <span className="text-ink-faint">{s.symbol} </span>
                        {s.label}
                      </label>
                      <span className="shrink-0 font-mono text-[0.8125rem] tabular-nums text-ink">
                        {value.toFixed(2)}
                      </span>
                    </div>
                    <input
                      id={id}
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={value}
                      aria-valuetext={`${value.toFixed(2)} — ${s.spoken}`}
                      aria-describedby={`${id}-hint`}
                      onChange={(ev) => setSmoothingValue(s.key, Number(ev.target.value))}
                      className={RANGE_CLASS}
                    />
                    <span
                      id={`${id}-hint`}
                      className="text-[0.6875rem] leading-tight text-ink-faint"
                    >
                      {s.hint}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={autoTune}
                className="label border border-line-strong px-3 py-1.5 text-ink-soft transition-colors duration-150 hover:border-ink hover:bg-ink hover:text-paper"
              >
                Tune on validation
              </button>
              <button
                type="button"
                onClick={resetSmoothing}
                disabled={!tuned}
                className="label border border-line px-3 py-1.5 text-ink-muted transition-colors duration-150 hover:border-ink-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted"
              >
                Reset
              </button>
            </div>
            <p className="mt-3 text-[0.6875rem] leading-relaxed text-ink-faint">
              Tuning grid-searches α, β and γ by rolling-origin cross-validation on{' '}
              {VALIDATION_FOLDS} folds carved out <em>before</em> the origin. The holdout
              stays untouched, so the scores above remain genuinely out-of-sample.
            </p>
          </Panel>
        </div>
      </div>

      {/* ---- Caption ----------------------------------------------- */}
      <footer className="border-t border-line px-4 py-3.5 sm:px-6">
        <p className="max-w-4xl text-[0.75rem] leading-relaxed text-ink-muted">
          <span className="label mr-2 align-baseline">Note</span>
          The demand series here is{' '}
          <strong className="font-medium text-ink-soft">
            synthetic data generated in the browser
          </strong>{' '}
          from a seeded pseudo-random generator — trend, annual seasonality, intermittent
          quiet months and noise. It is{' '}
          <strong className="font-medium text-ink-soft">
            not John Deere data, customer data, or freight data
          </strong>
          , and no figure on this page is a result from either engagement. What is real is
          the method: the train/holdout discipline, the forecasters, and the error measures
          are the ones those projects used. The fourth model is a{' '}
          <strong className="font-medium text-ink-soft">lag-feature ridge regression</strong>{' '}
          standing in for the gradient-boosting baseline from the freight comparison — same
          feature-engineering idea, a simpler estimator, and labelled as such rather than
          dressed up as LightGBM.
        </p>
      </footer>
    </div>
  )
}
