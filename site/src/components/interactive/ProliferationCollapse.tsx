import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import type { ReactNode } from 'react'
import type { MotionValue } from 'motion/react'
import { usePrefersReducedMotion } from '../../lib/motion'

/* -------------------------------------------------------------------------
 * Deterministic noise. Layout must be identical across renders and reloads,
 * so every position comes from a seeded generator rather than Math.random.
 * ---------------------------------------------------------------------- */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/** Critically-underdamped arrival: overshoots once, then settles. */
function springEase(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return 1 - Math.exp(-7 * t) * Math.cos(8.2 * t)
}

/* -------------------------------------------------------------------------
 * Model
 * ---------------------------------------------------------------------- */

type Tier = 'sm' | 'md' | 'lg'
type Phase = 'proliferated' | 'standardized' | 'between'

interface LayoutSpec {
  width: number
  height: number
  cols: number
  rows: number
  dotCount: number
  ringMin: number
  ringMax: number
  baseFont: number
  chipFont: number
  pad: number
  dotScale: number
}

const LAYOUTS: Record<Tier, LayoutSpec> = {
  sm: {
    width: 460,
    height: 780,
    cols: 2,
    rows: 3,
    dotCount: 126,
    ringMin: 22,
    ringMax: 54,
    baseFont: 14,
    chipFont: 11,
    pad: 22,
    dotScale: 1.5,
  },
  md: {
    width: 760,
    height: 580,
    cols: 3,
    rows: 2,
    dotCount: 186,
    ringMin: 24,
    ringMax: 62,
    baseFont: 13,
    chipFont: 10,
    pad: 26,
    dotScale: 1.15,
  },
  lg: {
    width: 1080,
    height: 620,
    cols: 3,
    rows: 2,
    dotCount: 246,
    ringMin: 26,
    ringMax: 74,
    baseFont: 13,
    chipFont: 10,
    pad: 30,
    dotScale: 1,
  },
}

interface BaseDef {
  code: string
  frame: string
  modules: readonly string[]
  weight: number
}

/** Six standard bases spanning the low-voltage frame range. */
const BASES: readonly BaseDef[] = [
  { code: 'BASE 01', frame: '100 A', modules: ['TRIP', 'AUX', 'LUG'], weight: 0.21 },
  { code: 'BASE 02', frame: '250 A', modules: ['TRIP', 'COMM', 'SHUNT'], weight: 0.19 },
  { code: 'BASE 03', frame: '400 A', modules: ['METER', 'COMM', 'LUG'], weight: 0.18 },
  { code: 'BASE 04', frame: '630 A', modules: ['METER', 'MOTOR', 'AUX'], weight: 0.16 },
  { code: 'BASE 05', frame: '800 A', modules: ['TRIP', 'MOTOR', 'SHUNT'], weight: 0.14 },
  { code: 'BASE 06', frame: '1200 A', modules: ['METER', 'COMM', 'MOTOR'], weight: 0.12 },
]

interface Dot {
  /** Scattered origin. */
  ax: number
  ay: number
  /** Clustered destination. */
  bx: number
  by: number
  base: number
  radius: number
  tone: number
  /** 0–1 position in the arrival wave. */
  delay: number
  phase: number
  freq: number
  amp: number
}

interface Cluster {
  index: number
  cx: number
  cy: number
  count: number
  def: BaseDef
}

interface Scene {
  spec: LayoutSpec
  dots: readonly Dot[]
  clusters: readonly Cluster[]
}

interface Metric {
  key: string
  label: string
  before: number
  after: number
  unit?: string
}

/** Illustrative figures, see the caption. */
const METRICS: readonly Metric[] = [
  { key: 'configs', label: 'Configurations offered', before: 248, after: 248 },
  { key: 'parts', label: 'Unique part numbers', before: 1410, after: 386 },
  { key: 'bases', label: 'Standard bases', before: 0, after: 6 },
  { key: 'modules', label: 'Add-on modules', before: 0, after: 18 },
  { key: 'docs', label: 'Documentation sets', before: 248, after: 24 },
]

const GOLDEN_ANGLE = 2.399963229728653

function buildScene(spec: LayoutSpec): Scene {
  const rand = mulberry32(0x5e6d21)
  const n = spec.dotCount

  // Six cluster centres on a regular grid, lifted slightly to leave room for
  // the label block that hangs beneath each one.
  const cellW = spec.width / spec.cols
  const cellH = spec.height / spec.rows
  const counts: number[] = []
  let assigned = 0
  BASES.forEach((base, i) => {
    const c = i === BASES.length - 1 ? n - assigned : Math.round(n * base.weight)
    counts.push(c)
    assigned += c
  })

  const clusters: Cluster[] = BASES.map((def, i) => ({
    index: i,
    def,
    count: counts[i] ?? 0,
    cx: cellW * ((i % spec.cols) + 0.5),
    cy: cellH * (Math.floor(i / spec.cols) + 0.5) - spec.ringMax * 0.42,
  }))

  // Membership list, shuffled so each base draws variants from across the
  // whole scattered field rather than from one corner of it.
  const membership: number[] = []
  counts.forEach((count, i) => {
    for (let k = 0; k < count; k += 1) membership.push(i)
  })
  for (let i = membership.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = membership[i] as number
    membership[i] = membership[j] as number
    membership[j] = tmp
  }

  // Scattered state: a jittered grid, which reads as organic noise without
  // the clumps and voids of uniform sampling.
  const innerW = spec.width - spec.pad * 2
  const innerH = spec.height - spec.pad * 2
  const gCols = Math.max(1, Math.round(Math.sqrt((n * innerW) / innerH)))
  const gRows = Math.ceil(n / gCols)
  const gw = innerW / gCols
  const gh = innerH / gRows

  const seats = new Array<number>(BASES.length).fill(0)
  const dots: Dot[] = []

  for (let i = 0; i < n; i += 1) {
    const col = i % gCols
    const row = Math.floor(i / gCols)
    const ax = spec.pad + (col + 0.5) * gw + (rand() - 0.5) * gw * 0.95
    const ay = spec.pad + (row + 0.5) * gh + (rand() - 0.5) * gh * 0.95

    const baseIndex = membership[i] ?? 0
    const cluster = clusters[baseIndex] as Cluster
    const seat = seats[baseIndex] as number
    seats[baseIndex] = seat + 1

    // Sunflower packing: even coverage of the disc around the base.
    const angle = seat * GOLDEN_ANGLE + baseIndex * 0.7
    const spread = Math.sqrt((seat + 0.5) / Math.max(1, cluster.count))
    const radius = spec.ringMin + (spec.ringMax - spec.ringMin) * spread

    dots.push({
      ax: Math.min(spec.width - spec.pad, Math.max(spec.pad, ax)),
      ay: Math.min(spec.height - spec.pad, Math.max(spec.pad, ay)),
      bx: cluster.cx + Math.cos(angle) * radius,
      by: cluster.cy + Math.sin(angle) * radius * 0.92,
      base: baseIndex,
      radius: (1.85 + rand() * 0.7) * spec.dotScale,
      tone: 0.58 + rand() * 0.34,
      delay: clamp01(0.58 * (ax / spec.width) + 0.42 * rand()),
      phase: rand() * Math.PI * 2,
      freq: 0.18 + rand() * 0.3,
      amp: (1.4 + rand() * 2.2) * spec.dotScale,
    })
  }

  return { spec, dots, clusters }
}

/* -------------------------------------------------------------------------
 * Presentation helpers
 * ---------------------------------------------------------------------- */

const fmt = (v: number): string => Math.round(v).toLocaleString('en-US')

function deltaLabel(m: Metric): string {
  if (m.before === m.after) return 'no change'
  if (m.before === 0) return `+${m.after}`
  const pct = Math.round(((m.after - m.before) / m.before) * 100)
  return `${pct > 0 ? '+' : '\u2212'}${Math.abs(pct)}%`
}

const STAGGER_SPAN = 0.44
const CONNECTOR_START = 0.58
const CONNECTOR_SPAN = 0.3

/* -------------------------------------------------------------------------
 * Component
 * ---------------------------------------------------------------------- */

export function ProliferationCollapse() {
  const reduced = usePrefersReducedMotion()
  const scrubId = useId()

  const [tier, setTier] = useState<Tier>('lg')
  const [phase, setPhase] = useState<Phase>('proliferated')

  const scene = useMemo(() => buildScene(LAYOUTS[tier]), [tier])
  const { spec, dots, clusters } = scene

  const progress = useMotionValue(0)
  const dotsOpacity = useTransform(progress, [0, 1], [1, 0.88])

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const dotEls = useRef<Array<SVGCircleElement | null>>([])
  const linkGroupRef = useRef<SVGGElement | null>(null)
  const linkPathRef = useRef<SVGPathElement | null>(null)
  const sliderRef = useRef<HTMLInputElement | null>(null)
  const runRef = useRef<{ stop: () => void } | null>(null)
  const touchedRef = useRef(false)

  /* --- container-width tiers ------------------------------------------- */
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const pick = (w: number): Tier => (w < 620 ? 'sm' : w < 980 ? 'md' : 'lg')
    setTier(pick(el.clientWidth))
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (typeof w === 'number') setTier(pick(w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* --- one write loop drives every node -------------------------------- */
  const writeFrame = useCallback(
    (p: number, seconds: number) => {
      const els = dotEls.current
      const jitter = reduced ? 0 : 1
      const linkT = clamp01((p - CONNECTOR_START) / CONNECTOR_SPAN)
      const wantLinks = linkT > 0.001
      let d = ''

      for (let i = 0; i < dots.length; i += 1) {
        const el = els[i]
        const dot = dots[i]
        if (!el || !dot) continue

        const local = reduced
          ? p
          : clamp01((p - dot.delay * STAGGER_SPAN) / (1 - STAGGER_SPAN))
        const e = reduced ? local : springEase(local)
        const drift = jitter * (1 - clamp01(e)) * dot.amp
        const x =
          dot.ax +
          (dot.bx - dot.ax) * e +
          (drift === 0 ? 0 : Math.sin(seconds * dot.freq * 2 + dot.phase) * drift)
        const y =
          dot.ay +
          (dot.by - dot.ay) * e +
          (drift === 0
            ? 0
            : Math.cos(seconds * dot.freq * 1.7 + dot.phase * 1.3) * drift * 0.8)

        el.setAttribute('cx', x.toFixed(2))
        el.setAttribute('cy', y.toFixed(2))

        if (wantLinks) {
          const c = clusters[dot.base]
          if (c) {
            const hx = c.cx + (x - c.cx) * linkT
            const hy = c.cy + (y - c.cy) * linkT
            d += `M${c.cx.toFixed(1)} ${c.cy.toFixed(1)}L${hx.toFixed(1)} ${hy.toFixed(1)}`
          }
        }
      }

      const group = linkGroupRef.current
      if (group) group.style.opacity = wantLinks ? String(linkT) : '0'
      const path = linkPathRef.current
      if (path) path.setAttribute('d', d)
    },
    [clusters, dots, reduced],
  )

  /* --- animation frames (skipped entirely under reduced motion) -------- */
  useEffect(() => {
    if (reduced) {
      writeFrame(progress.get(), 0)
      return progress.on('change', (p) => writeFrame(p, 0))
    }

    let raf = 0
    let visible = true
    let last = -1

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true
      },
      { rootMargin: '25% 0px' },
    )
    if (wrapRef.current) io.observe(wrapRef.current)

    const tick = (time: number) => {
      raf = requestAnimationFrame(tick)
      const p = progress.get()
      // Settled at the clustered end with no drift left: nothing to redraw.
      if (!visible || (p >= 0.9995 && last >= 0.9995)) {
        last = p
        return
      }
      last = p
      writeFrame(p, time / 1000)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
    }
  }, [progress, reduced, writeFrame])

  /* --- keep the slider, toggle and captions in step --------------------- */
  useEffect(() => {
    const sync = (p: number) => {
      if (sliderRef.current && document.activeElement !== sliderRef.current) {
        sliderRef.current.value = (p * 100).toFixed(1)
      }
      setPhase(p <= 0.02 ? 'proliferated' : p >= 0.98 ? 'standardized' : 'between')
    }
    sync(progress.get())
    return progress.on('change', sync)
  }, [progress])

  const animateTo = useCallback(
    (target: number) => {
      runRef.current?.stop()
      if (reduced) {
        progress.set(target)
        return
      }
      runRef.current = animate(progress, target, {
        duration: target > progress.get() ? 1.6 : 1.15,
        ease: [0.16, 1, 0.3, 1],
      })
    },
    [progress, reduced],
  )

  /* --- collapse once, unprompted, when the figure is first seen -------- */
  useEffect(() => {
    if (reduced) return
    const el = wrapRef.current
    if (!el) return
    let timer = 0
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        io.disconnect()
        timer = window.setTimeout(() => {
          if (!touchedRef.current) animateTo(1)
        }, 650)
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      window.clearTimeout(timer)
    }
  }, [animateTo, reduced])

  const circles = useMemo(
    () =>
      dots.map((dot, i) => (
        <circle
          key={i}
          ref={(el) => {
            dotEls.current[i] = el
          }}
          cx={dot.ax}
          cy={dot.ay}
          r={dot.radius}
          fill="var(--color-ink)"
          fillOpacity={dot.tone}
        />
      )),
    [dots],
  )

  const figureLabel =
    phase === 'standardized'
      ? `Standardized state: ${dots.length} product variants collapsed onto six standard bases, each serving a labelled family with add-on modules.`
      : phase === 'proliferated'
        ? `Proliferated state: ${dots.length} product variants scattered independently, with no shared base.`
        : 'Mid-transition: variants converging onto six standard bases.'

  const liveSummary =
    phase === 'between'
      ? ''
      : METRICS.map(
          (m) => `${m.label}: ${fmt(phase === 'standardized' ? m.after : m.before)}`,
        ).join('. ')

  return (
    <section className="font-sans text-ink">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="max-w-xl">
          <p className="label">Fig. 01 · MIT × GE Vernova · Low-voltage breaker platform</p>
          <h3 className="mt-2 text-2xl leading-tight sm:text-3xl">
            A product family accumulates variety one reasonable decision at a time.
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft sm:text-base">
            Every variant was justified on its own. Together they became the dominant cost
            driver. The fix is not fewer customer options, it is a standard base that
            carries the shared load, plus add-on modules that absorb the variation.
          </p>
        </div>
        <div className="w-full max-w-56 sm:w-56">
          <div className="dim-rule" />
          <p className="label mt-2">{dots.length} variants plotted</p>
        </div>
      </div>

      {/* ---- drawing sheet ------------------------------------------------ */}
      <div ref={wrapRef} className="reg-marks relative border border-line bg-card">
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <span className="label">
            {phase === 'standardized'
              ? 'Standardized · 6 bases'
              : phase === 'proliferated'
                ? 'Proliferated · no shared base'
                : 'Collapsing'}
          </span>
          <span className="label">Sheet 01 / rev. C</span>
        </div>

        <div className="relative overflow-hidden">
          <div className="bp-grid bp-mask pointer-events-none absolute inset-0" aria-hidden="true" />
          <svg
            viewBox={`0 0 ${spec.width} ${spec.height}`}
            className="relative block h-auto w-full"
            role="img"
            aria-label={figureLabel}
          >
            {clusters.map((c) => (
              <ClusterRing key={c.index} cluster={c} spec={spec} progress={progress} />
            ))}

            <g ref={linkGroupRef} style={{ opacity: 0 }}>
              <path
                ref={linkPathRef}
                fill="none"
                stroke="var(--color-line-strong)"
                strokeWidth={0.7 * spec.dotScale}
                strokeLinecap="round"
              />
            </g>

            <motion.g style={{ opacity: dotsOpacity }}>{circles}</motion.g>

            {clusters.map((c) => (
              <ClusterMark key={c.index} cluster={c} spec={spec} progress={progress} />
            ))}
          </svg>
        </div>

        {/* ---- legend ----------------------------------------------------- */}
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line px-3 py-2.5">
          <LegendItem label="One product variant">
            <circle cx="6" cy="6" r="2.4" fill="var(--color-ink)" />
          </LegendItem>
          <LegendItem label="Standard base">
            <rect x="1.5" y="1.5" width="9" height="9" fill="var(--color-signal)" />
          </LegendItem>
          <LegendItem label="Add-on module">
            <rect
              x="0.5"
              y="2.5"
              width="11"
              height="7"
              fill="none"
              stroke="var(--color-line-strong)"
            />
          </LegendItem>
          <LegendItem label="Variant served by a base">
            <line x1="0" y1="6" x2="12" y2="6" stroke="var(--color-line-strong)" />
          </LegendItem>
        </ul>
      </div>

      {/* ---- controls ------------------------------------------------------ */}
      <div className="mt-5 flex flex-col gap-5 border border-line bg-card p-4 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex shrink-0 border border-line" role="group" aria-label="Platform state">
          {(
            [
              ['Proliferated', 0],
              ['Standardized', 1],
            ] as const
          ).map(([text, target], i) => {
            const active =
              phase === (target === 1 ? 'standardized' : 'proliferated')
            return (
              <button
                key={text}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  touchedRef.current = true
                  animateTo(target)
                }}
                className={`label px-3.5 py-2 transition-colors duration-200 ${
                  i === 1 ? 'border-l border-line' : ''
                } ${active ? 'bg-ink text-paper' : 'text-ink-muted hover:text-ink'}`}
              >
                {text}
              </button>
            )
          })}
        </div>

        <div className="min-w-0 grow">
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={scrubId} className="label">
              Scrub the collapse
            </label>
            <ScrubReadout progress={progress} />
          </div>
          <input
            id={scrubId}
            ref={sliderRef}
            type="range"
            min={0}
            max={100}
            step={0.5}
            defaultValue={0}
            onChange={(event) => {
              touchedRef.current = true
              runRef.current?.stop()
              progress.set(Number(event.currentTarget.value) / 100)
            }}
            className="mt-2.5 w-full cursor-ew-resize accent-signal"
          />
        </div>
      </div>

      {/* ---- metrics ------------------------------------------------------- */}
      <div aria-live="polite" className="mt-5">
        <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
          {METRICS.map((m) => {
            const flat = m.before === m.after
            return (
              <div key={m.key} className="bg-card px-3.5 py-3.5" aria-hidden="true">
                <p className="label leading-tight">{m.label}</p>
                <p className="mt-2.5 font-mono text-2xl leading-none tracking-tight tnum text-ink">
                  <MetricValue progress={progress} metric={m} />
                </p>
                <p className="mt-2 font-mono text-[0.6875rem] tnum text-ink-faint">
                  {fmt(m.before)} <span className="text-ink-muted">→</span> {fmt(m.after)}
                </p>
                <p
                  className={`label mt-2 inline-block border px-1.5 py-0.5 ${
                    flat
                      ? 'border-line text-ink-muted'
                      : 'border-signal/40 bg-signal-wash text-signal-deep'
                  }`}
                >
                  {deltaLabel(m)}
                </p>
              </div>
            )
          })}
        </div>
        <p className="sr-only">{liveSummary}</p>
      </div>

      <p className="mt-3 max-w-3xl font-mono text-[0.6875rem] leading-relaxed text-ink-muted">
        Figures are illustrative of the standardization approach, not GE Vernova
        proprietary data. Counts are chosen to show the shape of the trade, not to report
        a measured result.
      </p>
    </section>
  )
}

/* -------------------------------------------------------------------------
 * Sub-components. Each owns its own transforms so nothing re-renders while
 * the scrub is moving.
 * ---------------------------------------------------------------------- */

interface MarkProps {
  cluster: Cluster
  spec: LayoutSpec
  progress: MotionValue<number>
}

function ClusterRing({ cluster, spec, progress }: MarkProps) {
  const opacity = useTransform(progress, [0.5, 0.85], [0, 1])
  return (
    <motion.circle
      cx={cluster.cx}
      cy={cluster.cy}
      r={spec.ringMax + 12}
      fill="none"
      stroke="var(--color-line)"
      strokeWidth={1}
      strokeDasharray="3 4"
      style={{ opacity }}
    />
  )
}

function ClusterMark({ cluster, spec, progress }: MarkProps) {
  const markOpacity = useTransform(progress, [0.4, 0.66], [0, 1])
  const markY = useTransform(progress, [0.4, 0.66], [10, 0])
  const textOpacity = useTransform(progress, [0.7, 0.94], [0, 1])

  const arm = spec.ringMin * 0.9
  const labelY = cluster.cy + spec.ringMax + spec.baseFont * 1.6
  const chipY = labelY + spec.baseFont * 2.5
  const chipH = spec.chipFont * 1.9
  const gap = spec.chipFont * 0.5
  const widths = cluster.def.modules.map((m) => m.length * spec.chipFont * 0.68 + spec.chipFont)
  const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1)
  const offsets = widths.map((_, i) =>
    widths.slice(0, i).reduce((a, b) => a + b + gap, cluster.cx - total / 2),
  )

  return (
    <>
      <motion.g style={{ opacity: markOpacity, y: markY }}>
        <circle cx={cluster.cx} cy={cluster.cy} r={13} fill="var(--color-card)" />
        <line
          x1={cluster.cx - arm}
          y1={cluster.cy}
          x2={cluster.cx + arm}
          y2={cluster.cy}
          stroke="var(--color-signal)"
          strokeWidth={0.8}
          strokeOpacity={0.5}
        />
        <line
          x1={cluster.cx}
          y1={cluster.cy - arm}
          x2={cluster.cx}
          y2={cluster.cy + arm}
          stroke="var(--color-signal)"
          strokeWidth={0.8}
          strokeOpacity={0.5}
        />
        <rect
          x={cluster.cx - 5}
          y={cluster.cy - 5}
          width={10}
          height={10}
          fill="var(--color-signal)"
        />
      </motion.g>

      <motion.g style={{ opacity: textOpacity }}>
        <text
          x={cluster.cx}
          y={labelY}
          textAnchor="middle"
          className="font-mono"
          fontSize={spec.baseFont}
          fontWeight={500}
          letterSpacing="0.08em"
          fill="var(--color-ink)"
        >
          {cluster.def.code}
        </text>
        <text
          x={cluster.cx}
          y={labelY + spec.baseFont * 1.2}
          textAnchor="middle"
          className="font-mono"
          fontSize={spec.chipFont}
          letterSpacing="0.06em"
          fill="var(--color-ink-muted)"
        >
          {cluster.def.frame} · {cluster.count} VARIANTS
        </text>
      </motion.g>

      {cluster.def.modules.map((mod, i) => {
        const w = widths[i] ?? 0
        return (
          <ModuleChip
            key={mod}
            label={mod}
            x={offsets[i] ?? cluster.cx}
            y={chipY}
            width={w}
            height={chipH}
            fontSize={spec.chipFont}
            index={i}
            progress={progress}
          />
        )
      })}
    </>
  )
}

interface ChipProps {
  label: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  index: number
  progress: MotionValue<number>
}

function ModuleChip({ label, x, y, width, height, fontSize, index, progress }: ChipProps) {
  const start = 0.76 + index * 0.035
  const opacity = useTransform(progress, [start, start + 0.18], [0, 1])
  return (
    <motion.g style={{ opacity }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="var(--color-paper)"
        stroke="var(--color-line-strong)"
        strokeWidth={0.8}
      />
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono"
        fontSize={fontSize}
        letterSpacing="0.08em"
        fill="var(--color-ink-soft)"
      >
        {label}
      </text>
    </motion.g>
  )
}

function MetricValue({ progress, metric }: { progress: MotionValue<number>; metric: Metric }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    const write = (p: number) => {
      if (ref.current) {
        ref.current.textContent = fmt(metric.before + (metric.after - metric.before) * p)
      }
    }
    write(progress.get())
    return progress.on('change', write)
  }, [metric, progress])
  return <span ref={ref} />
}

function ScrubReadout({ progress }: { progress: MotionValue<number> }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  useEffect(() => {
    const write = (p: number) => {
      if (ref.current) ref.current.textContent = `${(p * 100).toFixed(0)}%`
    }
    write(progress.get())
    return progress.on('change', write)
  }, [progress])
  return <span ref={ref} className="font-mono text-xs tnum text-ink-muted" />
}

function LegendItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" className="shrink-0">
        {children}
      </svg>
      <span className="label">{label}</span>
    </li>
  )
}
