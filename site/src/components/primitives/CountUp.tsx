import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../lib/motion'

interface CountUpProps {
  /** Any string; the numeric portion is what animates. e.g. "$10K", "R² = 0.998" */
  value: string
  className?: string
}

/**
 * Counts the numeric part of a label up on first view, preserving whatever
 * prefix/suffix the string carries so "$10K" and "40" both work.
 */
export function CountUp({ value, className = '' }: CountUpProps) {
  const reduced = usePrefersReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(reduced ? value : null)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }

    const match = value.match(/^(\D*?)([\d.]+)(.*)$/)
    if (!match) {
      setDisplay(value)
      return
    }

    const [, prefix, numStr, suffix] = match
    const target = parseFloat(numStr)
    const decimals = (numStr.split('.')[1] ?? '').length
    setDisplay(`${prefix}${(0).toFixed(decimals)}${suffix}`)

    const el = ref.current
    if (!el) return

    let frame = 0
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        observer.disconnect()

        const start = performance.now()
        const duration = 1100

        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration)
          // Ease-out cubic: fast then settles, reads as a instrument settling
          const eased = 1 - Math.pow(1 - t, 3)
          setDisplay(`${prefix}${(target * eased).toFixed(decimals)}${suffix}`)
          if (t < 1) frame = requestAnimationFrame(tick)
        }
        frame = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value, reduced])

  return (
    <span ref={ref} className={`tnum ${className}`}>
      {display ?? value}
    </span>
  )
}
