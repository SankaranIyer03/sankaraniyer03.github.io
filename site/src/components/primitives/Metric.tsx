import { CountUp } from './CountUp'

interface MetricProps {
  value: string
  unit?: string
  label: string
}

/** A single figure, set like a callout on a drawing. */
export function Metric({ value, unit, label }: MetricProps) {
  return (
    <div className="border-t border-line pt-3">
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[1.75rem] leading-none font-medium tracking-tight text-ink">
          <CountUp value={value} />
        </span>
        {unit && <span className="font-mono text-xs text-ink-muted">{unit}</span>}
      </div>
      <p className="mt-2 text-[12.5px] leading-snug text-ink-muted">{label}</p>
    </div>
  )
}

export function MetricRow({ metrics }: { metrics: MetricProps[] }) {
  if (!metrics.length) return null
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
      {metrics.map((m) => (
        <Metric key={m.label} {...m} />
      ))}
    </div>
  )
}
