import { useEffect } from 'react'
import Lenis from 'lenis'
import { usePrefersReducedMotion } from './motion'

let lenisInstance: Lenis | null = null

export function scrollTo(target: string | HTMLElement, offset = 0) {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, { offset, duration: 1.3 })
    return
  }
  const el = typeof target === 'string' ? document.querySelector(target) : target
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * Lenis-driven smooth scroll. Disabled outright under prefers-reduced-motion so
 * that assistive and motion-sensitive users get native scrolling.
 */
export function useSmoothScroll() {
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) {
      lenisInstance?.destroy()
      lenisInstance = null
      return
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    })
    lenisInstance = lenis

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
      lenisInstance = null
    }
  }, [reduced])
}
