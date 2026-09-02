import { useEffect, useState } from 'react'
import type { Transition, Variants } from 'motion/react'

/** Single source of truth for "should anything move". */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window === 'undefined'
      ? false
      : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}

export const easePrecise = [0.16, 1, 0.3, 1] as const
export const easeMech = [0.65, 0, 0.35, 1] as const

export const springSoft: Transition = { type: 'spring', stiffness: 120, damping: 20, mass: 0.6 }

/** Text and blocks rise slightly and sharpen into place. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.85, ease: easePrecise },
  },
}

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.075, delayChildren: 0.06 } },
}

/** Word-by-word reveal used for the standfirst paragraphs. */
export const wordIn: Variants = {
  hidden: { opacity: 0, y: '0.35em' },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easePrecise } },
}

/** Hairline rules that draw themselves outward from the left. */
export const ruleIn: Variants = {
  hidden: { scaleX: 0 },
  show: { scaleX: 1, transition: { duration: 1.1, ease: easePrecise } },
}

export const viewportOnce = { once: true, margin: '-12% 0px -12% 0px' } as const
