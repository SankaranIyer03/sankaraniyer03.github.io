import { useCallback, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import type { Transition } from 'motion/react'
import { usePrefersReducedMotion } from '../../lib/motion'

/* ------------------------------------------------------------------ *
 * Process constants
 * ------------------------------------------------------------------ */

const NOMINAL = 8.0
const TOLERANCE = 0.1
const LSL = NOMINAL - TOLERANCE
const USL = NOMINAL + TOLERANCE
const BATCH_N = 40

/** Individuals-chart constants: UCL = x̄ ± 2.66·MR̄, σ̂ = MR̄ / d₂. */
const E2 = 2.66
const D2 = 1.128

const DEFAULT_SEED = 4120931

/* ------------------------------------------------------------------ *
 * Parameters
 * ------------------------------------------------------------------ */

interface Params {
  layerHeight: number
  nozzleTemp: number
  printSpeed: number
  perimeters: number
  cooling: number
}

type ParamKey = keyof Params

/** Centre point of the experiment, the qualified baseline recipe. */
const BASELINE: Params = {
  layerHeight: 0.2,
  nozzleTemp: 215,
  printSpeed: 50,
  perimeters: 3,
  cooling: 60,
}

interface FactorSpec {
  key: ParamKey
  code: string
  label: string
  unit: string
  unitSpoken: string
  min: number
  max: number
  step: number
  decimals: number
  hint: string
}

const FACTORS: readonly FactorSpec[] = [
  {
    key: 'layerHeight',
    code: 'A',
    label: 'Layer height',
    unit: 'mm',
    unitSpoken: 'millimetres',
    min: 0.1,
    max: 0.32,
    step: 0.01,
    decimals: 2,
    hint: 'Staircase error and shrink on the curved bore wall',
  },
  {
    key: 'nozzleTemp',
    code: 'B',
    label: 'Nozzle temp',
    unit: '°C',
    unitSpoken: 'degrees Celsius',
    min: 195,
    max: 250,
    step: 1,
    decimals: 0,
    hint: 'Over-extrusion and die swell into the hole',
  },
  {
    key: 'printSpeed',
    code: 'C',
    label: 'Print speed',
    unit: 'mm/s',
    unitSpoken: 'millimetres per second',
    min: 30,
    max: 90,
    step: 1,
    decimals: 0,
    hint: 'Extrusion consistency, mostly inflates spread',
  },
  {
    key: 'perimeters',
    code: 'D',
    label: 'Perimeters',
    unit: 'walls',
    unitSpoken: 'walls',
    min: 2,
    max: 5,
    step: 1,
    decimals: 0,
    hint: 'Wall stack stiffness holding the bore round',
  },
  {
    key: 'cooling',
    code: 'E',
    label: 'Cooling fan',
    unit: '%',
    unitSpoken: 'percent',
    min: 0,
    max: 100,
    step: 5,
    decimals: 0,
    hint: 'Warp and shrink repeatability layer to layer',
  },
]

/* ------------------------------------------------------------------ *
 * Process model
 *
 * Mean shift coefficients (mm of bore diameter per unit of factor).
 * Negative = bore comes out undersize.
 * ------------------------------------------------------------------ */

const MEAN_LAYER = -0.62
const MEAN_TEMP = -0.0018
const MEAN_SPEED = -0.00035
const MEAN_PERIM = 0.006
const MEAN_COOL = -0.00022
/** Systematic bore offset carried by the toolpath itself. */
const MEAN_OFFSET = -0.008
/** Fan only starts pulling the bore in once it is blowing hard. */
const COOL_KNEE = 70

function processMean(p: Params): number {
  return (
    NOMINAL +
    MEAN_OFFSET +
    MEAN_LAYER * (p.layerHeight - BASELINE.layerHeight) +
    MEAN_TEMP * (p.nozzleTemp - BASELINE.nozzleTemp) +
    MEAN_SPEED * (p.printSpeed - BASELINE.printSpeed) +
    MEAN_PERIM * (p.perimeters - BASELINE.perimeters) +
    MEAN_COOL * Math.max(0, p.cooling - COOL_KNEE)
  )
}

/**
 * Independent variance sources, each expressed as a standard deviation in mm.
 * They combine in quadrature, which is what makes "add more walls" show up as
 * a shrinking σ rather than a mean shift.
 */
function sigmaTerms(p: Params): Record<ParamKey | 'residual', number> {
  return {
    layerHeight: 0.006 + 0.09 * (p.layerHeight - 0.1),
    nozzleTemp: 0.003 + 0.0002 * Math.abs(p.nozzleTemp - 212),
    printSpeed: 0.0025 + 0.000175 * (p.printSpeed - 30),
    perimeters: 0.0125 - 0.0028 * (p.perimeters - 2),
    cooling: 0.0115 - 0.00009 * p.cooling,
    residual: 0.0045,
  }
}

function processSigma(p: Params): number {
  const t = sigmaTerms(p)
  let sum = 0
  for (const v of Object.values(t)) sum += v * v
  return Math.sqrt(sum)
}

/* ------------------------------------------------------------------ *
 * Deterministic randomness
 * ------------------------------------------------------------------ */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(rand: () => number): number {
  let u = 0
  let v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** 40 sequential parts, in print order, with a short thermal warm-up trend. */
function simulateBatch(p: Params, seed: number): number[] {
  const rand = mulberry32(seed)
  const mu = processMean(p)
  const sd = processSigma(p)
  const out: number[] = new Array<number>(BATCH_N)
  for (let i = 0; i < BATCH_N; i += 1) {
    const warmUp = -0.55 * sd * Math.exp(-i / 3.5)
    out[i] = mu + warmUp + sd * gaussian(rand)
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Statistics
 * ------------------------------------------------------------------ */

interface Capability {
  mean: number
  mrBar: number
  sigmaWithin: number
  sOverall: number
  ucl: number
  lcl: number
  cp: number
  cpk: number
  ppk: number
  pctOutOfSpec: number
  outOfSpecCount: number
  outOfControlCount: number
  flagged: boolean[]
}

function computeCapability(values: number[]): Capability {
  const n = values.length
  let sum = 0
  for (const v of values) sum += v
  const mean = sum / n

  let ss = 0
  for (const v of values) ss += (v - mean) ** 2
  const sOverall = Math.sqrt(ss / Math.max(1, n - 1))

  let mrSum = 0
  for (let i = 1; i < n; i += 1) mrSum += Math.abs((values[i] ?? 0) - (values[i - 1] ?? 0))
  const mrBar = mrSum / Math.max(1, n - 1)

  const sigmaWithin = Math.max(mrBar / D2, 1e-6)
  const ucl = mean + E2 * mrBar
  const lcl = mean - E2 * mrBar

  const cp = (USL - LSL) / (6 * sigmaWithin)
  const cpk = Math.min((USL - mean) / (3 * sigmaWithin), (mean - LSL) / (3 * sigmaWithin))
  const sOverallSafe = Math.max(sOverall, 1e-6)
  const ppk = Math.min((USL - mean) / (3 * sOverallSafe), (mean - LSL) / (3 * sOverallSafe))

  const pctOutOfSpec =
    100 * (normalCdf((LSL - mean) / sOverallSafe) + (1 - normalCdf((USL - mean) / sOverallSafe)))

  let outOfSpecCount = 0
  let outOfControlCount = 0
  const flagged: boolean[] = values.map((v) => {
    const spec = v < LSL || v > USL
    const control = v < lcl || v > ucl
    if (spec) outOfSpecCount += 1
    if (control) outOfControlCount += 1
    return spec || control
  })

  return {
    mean,
    mrBar,
    sigmaWithin,
    sOverall,
    ucl,
    lcl,
    cp,
    cpk,
    ppk,
    pctOutOfSpec,
    outOfSpecCount,
    outOfControlCount,
    flagged,
  }
}

/** Abramowitz & Stegun 26.2.17. */
function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2)
  const poly =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  const upper = d * poly
  return z >= 0 ? 1 - upper : upper
}

/* -- F distribution p-value, via the regularised incomplete beta ----- */

function logGamma(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941678, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ]
  let y = x
  let tmp = x + 5.5
  tmp -= (x + 0.5) * Math.log(tmp)
  let ser = 1.000000000190015
  for (let j = 0; j < 6; j += 1) {
    y += 1
    ser += (cof[j] ?? 0) / y
  }
  return -tmp + Math.log((2.5066282746310007 * ser) / x)
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maxIterations = 200
  const eps = 3e-14
  const fpMin = 1e-300
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < fpMin) d = fpMin
  d = 1 / d
  let h = d
  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m
    let num = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + num * d
    if (Math.abs(d) < fpMin) d = fpMin
    c = 1 + num / c
    if (Math.abs(c) < fpMin) c = fpMin
    d = 1 / d
    h *= d * c
    num = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + num * d
    if (Math.abs(d) < fpMin) d = fpMin
    c = 1 + num / c
    if (Math.abs(c) < fpMin) c = fpMin
    d = 1 / d
    const delta = d * c
    h *= delta
    if (Math.abs(delta - 1) < eps) break
  }
  return h
}

function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  )
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(a, b, x)) / a
    : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b
}

function fPValue(f: number, df1: number, df2: number): number {
  if (!Number.isFinite(f) || f <= 0) return 1
  return incompleteBeta(df2 / 2, df1 / 2, df2 / (df2 + df1 * f))
}

/* ------------------------------------------------------------------ *
 * Factor effects, derived from the same coefficients the sim uses
 * ------------------------------------------------------------------ */

/** Pure-error mean square of the replicated centre points, in mm². */
const MS_ERROR = 1e-4
const DF_ERROR = 10

interface FactorEffect {
  key: ParamKey
  code: string
  label: string
  deltaMean: number
  deltaSpread: number
  ss: number
  contribution: number
  f: number
  p: number
  significant: boolean
}

/**
 * Each factor's effect is the swing it produces across its full experimental
 * range while every other factor is held at its current setting: how far the
 * mean walks, plus how much the ±3σ window opens or closes. Squaring gives an
 * ANOVA-style sum of squares, so the bar chart is literally a read-out of the
 * coefficients driving the simulation above.
 */
function computeEffects(p: Params): { effects: FactorEffect[]; residualShare: number } {
  const raw = FACTORS.map<FactorEffect>((spec) => {
    const lo: Params = { ...p, [spec.key]: spec.min }
    const hi: Params = { ...p, [spec.key]: spec.max }
    const deltaMean = Math.abs(processMean(hi) - processMean(lo))
    const deltaSpread = Math.abs(3 * processSigma(hi) - 3 * processSigma(lo))
    const ss = deltaMean * deltaMean + deltaSpread * deltaSpread
    const f = ss / MS_ERROR
    const pValue = fPValue(f, 1, DF_ERROR)
    return {
      key: spec.key,
      code: spec.code,
      label: spec.label,
      deltaMean,
      deltaSpread,
      ss,
      contribution: 0,
      f,
      p: pValue,
      significant: pValue < 0.05,
    }
  })

  const ssError = MS_ERROR * DF_ERROR
  const total = raw.reduce((acc, e) => acc + e.ss, 0) + ssError
  for (const e of raw) e.contribution = (100 * e.ss) / total

  raw.sort((a, b) => b.ss - a.ss)
  return { effects: raw, residualShare: (100 * ssError) / total }
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function niceTicks(min: number, max: number, target: number): { values: number[]; decimals: number } {
  const span = max - min
  if (!(span > 0)) return { values: [min], decimals: 3 }
  const rough = span / target
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalised = rough / magnitude
  const step = (normalised >= 5 ? 10 : normalised >= 2 ? 5 : normalised >= 1 ? 2 : 1) * magnitude
  const decimals = clamp(Math.ceil(-Math.log10(step)), 2, 4)
  const values: number[] = []
  const start = Math.ceil(min / step) * step
  for (let v = start; v <= max + step * 1e-6; v += step) values.push(Number(v.toFixed(10)))
  return { values, decimals }
}

function formatPercent(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '0.000'
  if (v < 0.001) return '<0.001'
  if (v < 1) return v.toFixed(3)
  if (v < 10) return v.toFixed(2)
  return v.toFixed(1)
}

/** Same number as formatPercent, phrased for a screen reader. */
function speakPercent(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return '0'
  if (v < 0.001) return 'less than 0.001'
  return formatPercent(v)
}

function formatP(p: number): string {
  if (p < 0.001) return 'p < 0.001'
  if (p < 0.01) return `p = ${p.toFixed(4)}`
  return `p = ${p.toFixed(3)}`
}

function cpkTone(cpk: number): string {
  if (cpk >= 1.33) return 'text-series-4'
  if (cpk >= 1.0) return 'text-series-5'
  return 'text-signal'
}

/** Measures the live width of a container so SVG user units map 1:1 to CSS px. */
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

/* ------------------------------------------------------------------ *
 * Layout primitives
 * ------------------------------------------------------------------ */

interface PanelProps {
  title: string
  meta?: string
  children: ReactNode
  className?: string
}

function Panel({ title, meta, children, className = '' }: PanelProps) {
  return (
    <section className={`flex min-w-0 flex-col bg-card ${className}`}>
      <header className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2.5 sm:px-5">
        <h3 className="label text-ink-soft">{title}</h3>
        {meta ? <span className="label tnum text-ink-faint">{meta}</span> : null}
      </header>
      <div className="min-w-0 flex-1 px-4 py-4 sm:px-5">{children}</div>
    </section>
  )
}

/* ------------------------------------------------------------------ *
 * Control chart
 * ------------------------------------------------------------------ */

interface ChartProps {
  values: number[]
  cap: Capability
  transition: Transition
}

function ControlChart({ values, cap, transition }: ChartProps) {
  const [ref, width] = useElementWidth(680)
  const compact = width < 460

  const height = Math.round(clamp(width * 0.44, 210, 300))
  const m = {
    top: 14,
    right: compact ? 40 : 56,
    bottom: 28,
    left: compact ? 40 : 48,
  }
  const plotW = Math.max(10, width - m.left - m.right)
  const plotH = Math.max(10, height - m.top - m.bottom)

  const lo = Math.min(LSL, cap.lcl, ...values)
  const hi = Math.max(USL, cap.ucl, ...values)
  const pad = (hi - lo) * 0.09 || 0.02
  const yMin = lo - pad
  const yMax = hi + pad

  const x = (i: number): number => m.left + (i / (BATCH_N - 1)) * plotW
  const y = (v: number): number => m.top + (1 - (v - yMin) / (yMax - yMin)) * plotH

  const ticks = niceTicks(yMin, yMax, 5)
  const xTicks = compact ? [0, 9, 19, 29, 39] : [0, 4, 9, 14, 19, 24, 29, 34, 39]

  const points = values.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ')

  const label =
    `Individuals control chart of bearing bore diameter for ${BATCH_N} sequential parts. ` +
    `Process mean ${cap.mean.toFixed(4)} millimetres, sigma ${cap.sigmaWithin.toFixed(4)} millimetres, ` +
    `Cp ${cap.cp.toFixed(2)}, Cpk ${cap.cpk.toFixed(2)}. ` +
    `${cap.outOfSpecCount} parts outside the ${LSL.toFixed(2)} to ${USL.toFixed(2)} millimetre specification and ` +
    `${cap.outOfControlCount} beyond the control limits.`

  const limitX = width - m.right + 4
  const limitAnchor: 'start' | 'end' = 'start'

  return (
    <div ref={ref} className="min-w-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={label}
      >
        {/* Out-of-tolerance zones */}
        <rect
          x={m.left}
          y={m.top}
          width={plotW}
          height={Math.max(0, y(USL) - m.top)}
          className="fill-signal-wash"
          opacity={0.7}
        />
        <rect
          x={m.left}
          y={y(LSL)}
          width={plotW}
          height={Math.max(0, m.top + plotH - y(LSL))}
          className="fill-signal-wash"
          opacity={0.7}
        />

        {/* Gridlines */}
        {ticks.values.map((t) => (
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

        {/* Specification limits */}
        {[
          { v: USL, name: 'USL' },
          { v: LSL, name: 'LSL' },
        ].map((s) => (
          <g key={s.name}>
            <line
              x1={m.left}
              x2={m.left + plotW}
              y1={y(s.v)}
              y2={y(s.v)}
              className="stroke-series-3"
              strokeWidth={1}
              strokeDasharray="7 4"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={limitX}
              y={y(s.v) + 3}
              textAnchor={limitAnchor}
              className="fill-series-3 font-mono"
              fontSize={9}
              letterSpacing="0.06em"
            >
              {s.name}
            </text>
          </g>
        ))}

        {/* Control limits (animated: they move with the data) */}
        {[
          { v: cap.ucl, name: 'UCL' },
          { v: cap.lcl, name: 'LCL' },
        ].map((c) => (
          <g key={c.name}>
            <motion.line
              x1={m.left}
              x2={m.left + plotW}
              initial={false}
              animate={{ y1: y(c.v), y2: y(c.v) }}
              transition={transition}
              className="stroke-ink-faint"
              strokeWidth={1}
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
            <motion.text
              x={limitX}
              initial={false}
              animate={{ y: y(c.v) + 3 }}
              transition={transition}
              textAnchor={limitAnchor}
              className="fill-ink-muted font-mono"
              fontSize={9}
              letterSpacing="0.06em"
            >
              {c.name}
            </motion.text>
          </g>
        ))}

        {/* Centre line */}
        <motion.line
          x1={m.left}
          x2={m.left + plotW}
          initial={false}
          animate={{ y1: y(cap.mean), y2: y(cap.mean) }}
          transition={transition}
          className="stroke-ink-soft"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <motion.text
          x={limitX}
          initial={false}
          animate={{ y: y(cap.mean) + 3 }}
          transition={transition}
          textAnchor={limitAnchor}
          className="fill-ink-soft font-mono"
          fontSize={9}
          letterSpacing="0.06em"
        >
          X̄
        </motion.text>

        {/* Series */}
        <motion.polyline
          initial={false}
          animate={{ points }}
          transition={transition}
          fill="none"
          className="stroke-ink"
          strokeWidth={1}
          opacity={0.42}
          vectorEffect="non-scaling-stroke"
        />

        {values.map((v, i) => {
          const flagged = cap.flagged[i] === true
          return (
            <g key={`pt${i}`}>
              {flagged ? (
                <motion.circle
                  cx={x(i)}
                  initial={false}
                  animate={{ cy: y(v) }}
                  transition={transition}
                  r={4.5}
                  fill="none"
                  className="stroke-signal"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              <motion.circle
                cx={x(i)}
                initial={false}
                animate={{ cy: y(v) }}
                transition={transition}
                r={flagged ? 2.2 : 1.9}
                className={flagged ? 'fill-signal' : 'fill-ink'}
              />
            </g>
          )
        })}

        {/* Y axis */}
        {ticks.values.map((t) => (
          <text
            key={`yt${t}`}
            x={m.left - 6}
            y={y(t) + 3}
            textAnchor="end"
            className="fill-ink-faint font-mono"
            fontSize={9}
          >
            {t.toFixed(ticks.decimals)}
          </text>
        ))}

        {/* X axis */}
        {xTicks.map((i) => (
          <g key={`xt${i}`}>
            <line
              x1={x(i)}
              x2={x(i)}
              y1={m.top + plotH}
              y2={m.top + plotH + 4}
              className="stroke-line-strong"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={x(i)}
              y={m.top + plotH + 16}
              textAnchor="middle"
              className="fill-ink-faint font-mono"
              fontSize={9}
            >
              {i + 1}
            </text>
          </g>
        ))}
        <text
          x={m.left}
          y={height - 1}
          className="fill-ink-faint font-mono"
          fontSize={8}
          letterSpacing="0.14em"
        >
          PART No. (PRINT ORDER)
        </text>
        <text
          x={m.left - 6}
          y={m.top - 4}
          textAnchor="end"
          className="fill-ink-faint font-mono"
          fontSize={8}
          letterSpacing="0.14em"
        >
          mm
        </text>
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Distribution
 * ------------------------------------------------------------------ */

const BIN_COUNT = 13

function Histogram({ values, cap, transition }: ChartProps) {
  const [ref, width] = useElementWidth(320)
  const height = Math.round(clamp(width * 0.62, 150, 210))
  const m = { top: 12, right: 8, bottom: 26, left: 22 }
  const plotW = Math.max(10, width - m.left - m.right)
  const plotH = Math.max(10, height - m.top - m.bottom)

  const lo = Math.min(LSL, ...values)
  const hi = Math.max(USL, ...values)
  const pad = (hi - lo) * 0.07 || 0.02
  const xMin = lo - pad
  const xMax = hi + pad
  const binWidth = (xMax - xMin) / BIN_COUNT

  const counts = new Array<number>(BIN_COUNT).fill(0)
  for (const v of values) {
    const idx = clamp(Math.floor((v - xMin) / binWidth), 0, BIN_COUNT - 1)
    counts[idx] = (counts[idx] ?? 0) + 1
  }
  const maxCount = Math.max(1, ...counts)

  const sx = (v: number): number => m.left + ((v - xMin) / (xMax - xMin)) * plotW
  const sy = (c: number): number => m.top + (1 - c / maxCount) * plotH

  // Fitted normal, scaled to the bar area so the two read on the same axis.
  const s = Math.max(cap.sOverall, 1e-6)
  const curve: string[] = []
  for (let i = 0; i <= 60; i += 1) {
    const v = xMin + ((xMax - xMin) * i) / 60
    const density = Math.exp(-0.5 * ((v - cap.mean) / s) ** 2) / (s * Math.sqrt(2 * Math.PI))
    const count = density * BATCH_N * binWidth
    curve.push(`${i === 0 ? 'M' : 'L'}${sx(v).toFixed(2)},${sy(Math.min(count, maxCount * 1.4)).toFixed(2)}`)
  }

  const label =
    `Histogram of ${BATCH_N} bore diameter measurements against specification limits ` +
    `${LSL.toFixed(2)} and ${USL.toFixed(2)} millimetres. Mean ${cap.mean.toFixed(4)}, ` +
    `Cpk ${cap.cpk.toFixed(2)}, estimated ${speakPercent(cap.pctOutOfSpec)} percent out of specification.`

  const axisTicks = niceTicks(xMin, xMax, 3)

  return (
    <div ref={ref} className="min-w-0">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={label}
      >
        <line
          x1={m.left}
          x2={m.left + plotW}
          y1={m.top + plotH}
          y2={m.top + plotH}
          className="stroke-line-strong"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />

        {counts.map((c, i) => {
          const binLo = xMin + i * binWidth
          const binHi = binLo + binWidth
          const outside = binHi <= LSL || binLo >= USL
          const bx = sx(binLo) + 0.75
          const bw = Math.max(1, sx(binHi) - sx(binLo) - 1.5)
          return (
            <motion.rect
              key={`bin${i}`}
              x={bx}
              width={bw}
              initial={false}
              animate={{ y: sy(c), height: Math.max(0, m.top + plotH - sy(c)) }}
              transition={transition}
              className={outside ? 'fill-signal-wash stroke-signal' : 'fill-paper-deep stroke-ink-soft'}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )
        })}

        <motion.path
          initial={false}
          animate={{ d: curve.join(' ') }}
          transition={transition}
          fill="none"
          className="stroke-ink-muted"
          strokeWidth={1}
          strokeDasharray="3 2"
          vectorEffect="non-scaling-stroke"
        />

        {[
          { v: LSL, name: 'LSL' },
          { v: USL, name: 'USL' },
        ].map((sp) => (
          <g key={sp.name}>
            <line
              x1={sx(sp.v)}
              x2={sx(sp.v)}
              y1={m.top - 6}
              y2={m.top + plotH}
              className="stroke-series-3"
              strokeWidth={1}
              strokeDasharray="7 4"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={sx(sp.v)}
              y={m.top - 9}
              textAnchor="middle"
              className="fill-series-3 font-mono"
              fontSize={8}
              letterSpacing="0.06em"
            >
              {sp.name}
            </text>
          </g>
        ))}

        <motion.line
          initial={false}
          animate={{ x1: sx(cap.mean), x2: sx(cap.mean) }}
          transition={transition}
          y1={m.top}
          y2={m.top + plotH}
          className="stroke-ink"
          strokeWidth={1}
          strokeDasharray="1 3"
          vectorEffect="non-scaling-stroke"
        />

        {axisTicks.values.map((t) => (
          <text
            key={`hx${t}`}
            x={sx(t)}
            y={m.top + plotH + 13}
            textAnchor="middle"
            className="fill-ink-faint font-mono"
            fontSize={9}
          >
            {t.toFixed(axisTicks.decimals)}
          </text>
        ))}
        <text
          x={m.left - 4}
          y={m.top + 4}
          textAnchor="end"
          className="fill-ink-faint font-mono"
          fontSize={8}
        >
          {maxCount}
        </text>
        <text
          x={m.left - 4}
          y={m.top + plotH}
          textAnchor="end"
          className="fill-ink-faint font-mono"
          fontSize={8}
        >
          0
        </text>
        <text
          x={m.left + plotW}
          y={height - 1}
          textAnchor="end"
          className="fill-ink-faint font-mono"
          fontSize={8}
          letterSpacing="0.14em"
        >
          BORE ⌀ mm
        </text>
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export function SPCChart() {
  const reduced = usePrefersReducedMotion()
  const idBase = useId()

  const [params, setParams] = useState<Params>(BASELINE)
  const [seed, setSeed] = useState<number>(DEFAULT_SEED)
  const [batch, setBatch] = useState<number>(1)

  const values = useMemo(() => simulateBatch(params, seed), [params, seed])
  const cap = useMemo(() => computeCapability(values), [values])
  const { effects, residualShare } = useMemo(() => computeEffects(params), [params])

  const transition: Transition = reduced
    ? { duration: 0 }
    : { duration: 0.42, ease: [0.16, 1, 0.3, 1] }

  const setParam = useCallback((key: ParamKey, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }))
  }, [])

  const rerun = useCallback(() => {
    setSeed((s) => (Math.imul(s, 1664525) + 1013904223) >>> 0)
    setBatch((b) => b + 1)
  }, [])

  const reset = useCallback(() => {
    setParams(BASELINE)
    setSeed(DEFAULT_SEED)
    setBatch(1)
  }, [])

  const modified = FACTORS.some((f) => params[f.key] !== BASELINE[f.key])
  const maxSs = effects[0]?.ss ?? 1

  const readout: { term: string; value: string; tone?: string; note?: string }[] = [
    { term: 'Mean  x̄', value: `${cap.mean.toFixed(4)} mm` },
    { term: 'MR̄', value: `${cap.mrBar.toFixed(4)} mm` },
    { term: 'Sigma  σ̂', value: `${cap.sigmaWithin.toFixed(4)} mm`, note: 'MR̄ / d₂' },
    { term: 'Overall  s', value: `${cap.sOverall.toFixed(4)} mm` },
    { term: 'Cp', value: cap.cp.toFixed(2) },
    { term: 'Cpk', value: cap.cpk.toFixed(2), tone: cpkTone(cap.cpk) },
    { term: 'Ppk', value: cap.ppk.toFixed(2) },
    {
      term: 'Out of spec',
      value: `${formatPercent(cap.pctOutOfSpec)} %`,
      tone: cap.pctOutOfSpec > 0.5 ? 'text-signal' : undefined,
      note: 'estimated',
    },
  ]

  return (
    <div className="reg-marks relative border border-line bg-card">
      {/* ---- Title block ------------------------------------------- */}
      <header className="bp-grid border-b border-line px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="label">Fig. 04, Process capability lab</p>
            <h2 className="mt-1.5 text-lg leading-tight text-ink sm:text-xl">
              Bearing bore diameter, FDM axle holder
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-muted">
              Move a print parameter and watch the process answer. Nominal bore{' '}
              <span className="font-mono tnum text-ink-soft">⌀8.00</span> mm, tolerance{' '}
              <span className="font-mono tnum text-ink-soft">±0.10</span> mm, batch of{' '}
              <span className="font-mono tnum text-ink-soft">40</span> drivetrains.
            </p>
          </div>
          <dl className="flex shrink-0 items-end gap-5">
            <div>
              <dt className="label">Cpk</dt>
              <dd className={`font-mono tnum text-3xl leading-none ${cpkTone(cap.cpk)}`}>
                {cap.cpk.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="label">Batch</dt>
              <dd className="font-mono tnum text-3xl leading-none text-ink-faint">
                {String(batch).padStart(2, '0')}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {/* ---- Body -------------------------------------------------- */}
      <div className="grid gap-px bg-line lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_23rem]">
        {/* Left column */}
        <div className="grid min-w-0 gap-px bg-line">
          <Panel
            title="Individuals (I) chart"
            meta={`n = ${BATCH_N} · UCL = x̄ ± 2.66·MR̄`}
          >
            <ControlChart values={values} cap={cap} transition={transition} />
            <ul className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <li className="flex items-center gap-2">
                <svg width={12} height={10} aria-hidden="true" className="shrink-0">
                  <circle cx={6} cy={5} r={1.9} className="fill-ink" />
                </svg>
                <span className="label normal-case tracking-normal text-ink-muted">
                  in control &amp; in spec
                </span>
              </li>
              <li className="flex items-center gap-2">
                <svg width={12} height={10} aria-hidden="true" className="shrink-0">
                  <circle cx={6} cy={5} r={4} fill="none" className="stroke-signal" strokeWidth={1} />
                  <circle cx={6} cy={5} r={2.2} className="fill-signal" />
                </svg>
                <span className="label normal-case tracking-normal text-ink-muted">
                  out of spec or beyond control limit
                </span>
              </li>
              <li className="flex items-center gap-2">
                <svg width={20} height={10} aria-hidden="true" className="shrink-0">
                  <line
                    x1={0}
                    x2={20}
                    y1={5}
                    y2={5}
                    className="stroke-series-3"
                    strokeWidth={1}
                    strokeDasharray="7 4"
                  />
                </svg>
                <span className="label normal-case tracking-normal text-ink-muted">
                  spec limit
                </span>
              </li>
              <li className="ml-auto font-mono text-[0.6875rem] tabular-nums text-ink-soft">
                <span className={cap.outOfSpecCount > 0 ? 'text-signal' : ''}>
                  {cap.outOfSpecCount}
                </span>
                <span className="text-ink-faint"> / {BATCH_N} out of spec · </span>
                <span className={cap.outOfControlCount > 0 ? 'text-signal' : ''}>
                  {cap.outOfControlCount}
                </span>
                <span className="text-ink-faint"> out of control</span>
              </li>
            </ul>
          </Panel>

          <Panel
            title="Factor effects, ANOVA"
            meta={`2⁵ screening · df error = ${DF_ERROR}`}
          >
            <p className="mb-3 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Share of total variation each factor contributes across its full experimental range,
              with the other four held at their current settings. Grey bars did not clear the 5 %
              significance threshold.
            </p>
            <ul className="grid gap-2.5">
              {effects.map((e) => {
                const pct = Math.max(1.2, (100 * e.ss) / maxSs)
                return (
                  <li key={e.key} className="grid gap-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span
                        className={`font-mono text-[0.75rem] ${
                          e.significant ? 'text-ink' : 'text-ink-faint'
                        }`}
                      >
                        <span className="text-ink-faint">{e.code} · </span>
                        {e.label}
                      </span>
                      <span className="flex shrink-0 items-baseline gap-3 font-mono text-[0.6875rem] tabular-nums">
                        <span className={e.significant ? 'text-ink-soft' : 'text-ink-faint'}>
                          {e.contribution.toFixed(1)} %
                        </span>
                        <span
                          className={`w-[5.5rem] text-right ${
                            e.significant ? 'text-signal' : 'text-ink-faint'
                          }`}
                        >
                          {formatP(e.p)}
                        </span>
                      </span>
                    </div>
                    <svg
                      viewBox="0 0 100 6"
                      preserveAspectRatio="none"
                      className="block h-[6px] w-full"
                      aria-hidden="true"
                    >
                      <rect x={0} y={0} width={100} height={6} className="fill-paper-deep" />
                      <motion.rect
                        x={0}
                        y={0}
                        height={6}
                        initial={false}
                        animate={{ width: pct }}
                        transition={transition}
                        className={e.significant ? 'fill-ink' : 'fill-line-strong'}
                      />
                    </svg>
                  </li>
                )
              })}
              <li className="grid gap-1 pt-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[0.75rem] text-ink-faint">
                    Residual / pure error
                  </span>
                  <span className="flex shrink-0 items-baseline gap-3 font-mono text-[0.6875rem] tabular-nums text-ink-faint">
                    <span>{residualShare.toFixed(1)} %</span>
                    <span className="w-[5.5rem] text-right">, </span>
                  </span>
                </div>
                <svg
                  viewBox="0 0 100 6"
                  preserveAspectRatio="none"
                  className="block h-[6px] w-full"
                  aria-hidden="true"
                >
                  <rect x={0} y={0} width={100} height={6} className="fill-paper-deep" />
                  <motion.rect
                    x={0}
                    y={0}
                    height={6}
                    initial={false}
                    animate={{
                      width: Math.max(
                        1.2,
                        (100 * MS_ERROR * DF_ERROR) / Math.max(maxSs, 1e-9),
                      ),
                    }}
                    transition={transition}
                    className="fill-line-strong"
                  />
                </svg>
              </li>
            </ul>
          </Panel>
        </div>

        {/* Right column */}
        <div className="grid min-w-0 auto-rows-min gap-px bg-line">
          <Panel title="Print parameters" meta={modified ? 'modified' : 'baseline'}>
            <div className="grid gap-4">
              {FACTORS.map((f) => {
                const id = `${idBase}-${f.key}`
                const value = params[f.key]
                return (
                  <div key={f.key} className="grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <label htmlFor={id} className="label truncate text-ink-soft">
                        <span className="text-ink-faint">{f.code} </span>
                        {f.label}
                      </label>
                      <span className="shrink-0 font-mono text-[0.8125rem] tabular-nums text-ink">
                        {value.toFixed(f.decimals)}
                        <span className="text-ink-faint"> {f.unit}</span>
                      </span>
                    </div>
                    <input
                      id={id}
                      type="range"
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={value}
                      aria-valuetext={`${value.toFixed(f.decimals)} ${f.unitSpoken}`}
                      aria-describedby={`${id}-hint`}
                      onChange={(ev) => setParam(f.key, Number(ev.target.value))}
                      className="h-3.5 w-full cursor-pointer appearance-none bg-transparent
                        [&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-line-strong
                        [&::-webkit-slider-thumb]:mt-[-5px] [&::-webkit-slider-thumb]:h-[11px] [&::-webkit-slider-thumb]:w-[11px]
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-ink
                        [&::-webkit-slider-thumb]:bg-paper [&:hover::-webkit-slider-thumb]:border-signal
                        [&:hover::-webkit-slider-thumb]:bg-signal
                        [&::-moz-range-track]:h-px [&::-moz-range-track]:bg-line-strong
                        [&::-moz-range-thumb]:h-[11px] [&::-moz-range-thumb]:w-[11px] [&::-moz-range-thumb]:rounded-none
                        [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-ink [&::-moz-range-thumb]:bg-paper
                        [&:hover::-moz-range-thumb]:border-signal [&:hover::-moz-range-thumb]:bg-signal"
                    />
                    <div className="flex items-baseline justify-between gap-2">
                      <span id={`${id}-hint`} className="min-w-0 truncate text-[0.6875rem] leading-tight text-ink-faint">
                        {f.hint}
                      </span>
                      <span className="shrink-0 font-mono text-[0.625rem] tabular-nums text-ink-faint">
                        {f.min.toFixed(f.decimals)}–{f.max.toFixed(f.decimals)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <button
                type="button"
                onClick={rerun}
                className="label border border-line-strong px-3 py-1.5 text-ink-soft transition-colors duration-150 hover:border-ink hover:bg-ink hover:text-paper"
              >
                Re-run batch
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={!modified && seed === DEFAULT_SEED}
                className="label border border-line px-3 py-1.5 text-ink-muted transition-colors duration-150 hover:border-ink-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-muted"
              >
                Reset to baseline
              </button>
            </div>
          </Panel>

          <Panel title="Capability" meta={`seed ${seed.toString(16).toUpperCase().padStart(8, '0')}`}>
            <dl className="grid grid-cols-[1fr_auto] items-baseline gap-x-4">
              {readout.map((row, i) => (
                <div key={row.term} className="contents">
                  <dt
                    className={`flex items-baseline gap-2 border-line py-1.5 font-mono text-[0.75rem] text-ink-muted ${
                      i > 0 ? 'border-t' : ''
                    }`}
                  >
                    <span>{row.term}</span>
                    {row.note ? (
                      <span className="text-[0.625rem] text-ink-faint">{row.note}</span>
                    ) : null}
                  </dt>
                  <dd
                    className={`border-line py-1.5 text-right font-mono text-[0.8125rem] tabular-nums ${
                      i > 0 ? 'border-t' : ''
                    } ${row.tone ?? 'text-ink'}`}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex items-center gap-2">
              <span className="dim-rule flex-1" aria-hidden="true" />
              <span className="label text-[0.625rem]">
                {cap.cpk >= 1.33
                  ? 'capable'
                  : cap.cpk >= 1.0
                    ? 'marginal, tighten or re-centre'
                    : 'not capable'}
              </span>
            </div>
          </Panel>

          <Panel title="Distribution" meta={`${BIN_COUNT} bins`}>
            <Histogram values={values} cap={cap} transition={transition} />
          </Panel>
        </div>
      </div>

      {/* ---- Caption ----------------------------------------------- */}
      <footer className="border-t border-line px-4 py-3.5 sm:px-6">
        <p className="max-w-4xl text-[0.75rem] leading-relaxed text-ink-muted">
          <span className="label mr-2 align-baseline">Note</span>
          This is an <strong className="font-medium text-ink-soft">interactive model of the
          experimentally-identified relationships</strong> between print parameters and bore
          variation, not a replay of the raw measured data. Parts are drawn from a seeded
          pseudo-random generator using the mean-shift and variance coefficients that the DOE and
          ANOVA produced (plus a small thermal warm-up trend over the first few parts), so the
          direction and relative size of each effect are real while the individual points are
          synthetic. Control limits, capability indices and p-values are computed live from the
          simulated batch.
        </p>
      </footer>
    </div>
  )
}
