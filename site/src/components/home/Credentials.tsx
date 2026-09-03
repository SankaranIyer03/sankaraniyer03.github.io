import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { logoCards } from '../../content/logos'
import { getMedia } from '../../lib/media'
import { easePrecise, staggerParent, usePrefersReducedMotion } from '../../lib/motion'

const DWELL_MS = 2200

/**
 * Logos need `object-contain` against a transparent background, which is the
 * opposite of what <Figure> does, it crops to fill and carries a blur
 * placeholder. A bare <img> is the right primitive here.
 */
function LogoMark({ media, alt, active }: { media: string; alt: string; active: boolean }) {
  const entry = getMedia(media)
  if (!entry) return <span className="label">missing</span>

  return (
    <img
      src={entry.mid}
      srcSet={`${entry.small} 160w, ${entry.mid} 320w`}
      sizes="120px"
      alt={alt}
      loading="eager"
      decoding="async"
      className={`max-h-7 max-w-full object-contain transition-[filter,opacity,transform] duration-500 ${
        active ? 'scale-105 opacity-100 grayscale-0' : 'opacity-65 grayscale'
      }`}
    />
  )
}

const cardIn = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easePrecise } },
}

/**
 * Six cards, logos only. The names and the numbers live on the experience and
 * project pages, here the logos are doing the work on their own. They sit
 * desaturated until one is active, then that card lifts and colour-corrects.
 *
 * The row walks itself left to right so a recruiter who never hovers still
 * sees every mark. A real hover takes over immediately and holds that card
 * until the pointer leaves the row, at which point the walk resumes from
 * the next one.
 */
export function Credentials() {
  const reduced = usePrefersReducedMotion()
  const [active, setActive] = useState(0)
  const [held, setHeld] = useState<number | null>(null)

  useEffect(() => {
    if (reduced || held !== null) return
    const id = window.setTimeout(() => {
      setActive((i) => (i + 1) % logoCards.length)
    }, DWELL_MS)
    return () => window.clearTimeout(id)
  }, [active, held, reduced])

  const shown = held ?? (reduced ? -1 : active)

  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="label label-signal">Credentials</span>
        <span className="h-px flex-1 bg-line" />
        <span className="label hidden text-ink-faint sm:inline">Educated at · Built at</span>
      </div>

      <motion.ul
        className="mt-3 grid max-w-2xl grid-cols-3 gap-1.5 sm:grid-cols-6"
        variants={staggerParent}
        initial="hidden"
        animate="show"
        onMouseLeave={() => {
          if (held !== null) {
            setActive((held + 1) % logoCards.length)
            setHeld(null)
          }
        }}
      >
        {logoCards.map((card, i) => {
          const isActive = shown === i
          return (
            <motion.li key={card.id} variants={cardIn} className="relative">
              <div
                onMouseEnter={() => setHeld(i)}
                className={`flex h-14 cursor-default items-center justify-center border px-2.5 transition-[transform,border-color,background-color,box-shadow] duration-300 ${
                  isActive
                    ? '-translate-y-0.5 border-line-strong bg-paper shadow-[0_8px_20px_-12px_rgb(0_0_0/0.35)]'
                    : 'border-line bg-card'
                }`}
              >
                <LogoMark media={card.logo} alt={card.name} active={isActive} />

                <span
                  className={`pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 border border-line bg-paper px-1.5 py-1 whitespace-nowrap transition-opacity duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <span className="label text-[9px]">{card.name}</span>
                </span>
              </div>
            </motion.li>
          )
        })}
      </motion.ul>
    </div>
  )
}
