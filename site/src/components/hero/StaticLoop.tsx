import { acts } from '../../content/acts'

const R = 128
const TICKS = 96

/**
 * SVG stand-in for the 3D hero, shown while the WebGL bundle loads. Matches the
 * real scene's geometry so there is no visual jump when it swaps in, and it is
 * a complete, correct graphic in its own right if WebGL is unavailable.
 */
export function StaticLoop() {
  return (
    <svg
      viewBox="-200 -200 400 400"
      className="h-full w-full"
      role="img"
      aria-label="The closed loop: design, make, automate, prove"
    >
      {/* Dial ticks */}
      <g stroke="#111110" strokeOpacity={0.22}>
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * Math.PI * 2
          const major = i % 8 === 0
          const r0 = R + 4
          const r1 = R + (major ? 13 : 7)
          return (
            <line
              key={i}
              x1={Math.cos(a) * r0}
              y1={-Math.sin(a) * r0}
              x2={Math.cos(a) * r1}
              y2={-Math.sin(a) * r1}
            />
          )
        })}
      </g>

      <circle r={R} fill="none" stroke="#111110" strokeOpacity={0.28} />
      <circle r={R + 19} fill="none" stroke="#111110" strokeOpacity={0.1} />

      {/* Centre part, drawn as a simple hub rather than a full gear */}
      <circle r={62} fill="none" stroke="#111110" strokeOpacity={0.35} />
      <circle r={17} fill="none" stroke="#111110" strokeOpacity={0.35} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6
        return (
          <circle
            key={i}
            cx={Math.cos(a) * 37}
            cy={-Math.sin(a) * 37}
            r={5.5}
            fill="none"
            stroke="#111110"
            strokeOpacity={0.3}
          />
        )
      })}

      {/* Act nodes */}
      {acts.map((act) => {
        const a = (act.angle * Math.PI) / 180
        const x = Math.cos(a) * R
        const y = -Math.sin(a) * R
        return (
          <g key={act.id}>
            <rect
              x={x - 6}
              y={y - 6}
              width={12}
              height={12}
              fill="none"
              stroke="#111110"
              strokeOpacity={0.45}
            />
            <circle cx={x} cy={y} r={3} fill="#111110" />
            <text
              x={Math.cos(a) * (R + 30)}
              y={-Math.sin(a) * (R + 30)}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#e5471b"
              fontFamily="var(--font-mono)"
              fontSize={11}
              letterSpacing="0.13em"
            >
              {act.code}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
