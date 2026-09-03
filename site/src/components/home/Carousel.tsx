import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { slides } from '../../content/carousel'
import { Figure } from '../primitives/Figure'
import { getMedia } from '../../lib/media'
import { easePrecise, usePrefersReducedMotion } from '../../lib/motion'

const DWELL_MS = 5600

/** The frame is portrait, so a wider-than-tall source has to be fitted. */
const isLandscape = (media: string) => (getMedia(media)?.aspect ?? 0) > 1

/**
 * Landing carousel. Auto-advances, but every automatic behaviour has a manual
 * override: hover or focus pauses it, arrow keys and the numbered ticks drive
 * it directly, and reduced-motion turns the timer off entirely rather than
 * merely shortening it.
 *
 * The caption is part of the component rather than an overlay on the image , 
 * white text on an arbitrary photograph is a legibility gamble, and these
 * captions carry the actual claims.
 */
export function Carousel() {
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timer = useRef<number | null>(null)

  const go = useCallback((next: number) => {
    setIndex(((next % slides.length) + slides.length) % slides.length)
  }, [])

  // A single timer that restarts whenever the index changes, so a manual
  // advance also resets the dwell rather than cutting the next slide short.
  useEffect(() => {
    if (reduced || paused) return
    timer.current = window.setTimeout(() => go(index + 1), DWELL_MS)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [index, paused, reduced, go])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      go(index + 1)
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      go(index - 1)
    }
  }

  const slide = slides[index]

  return (
    <div
      className="group/car relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
      role="region"
      aria-roledescription="carousel"
      aria-label="Sankaran Iyer at work"
      tabIndex={0}
    >
      {/* ---------------- Frame ---------------- */}
      <div className="reg-marks relative border border-line bg-card p-2.5">
        {/* Height is tied to the viewport rather than fixed by an aspect ratio,
            so the whole first screen still clears the fold on a short laptop
            without cropping the photograph differently on a tall one. */}
        <div className="relative h-[min(58svh,560px)] w-full overflow-hidden bg-paper-deep">
          <AnimatePresence initial={false} mode="sync">
            <motion.div
              key={slide.media}
              className="absolute inset-0"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.9, ease: easePrecise },
                // Slow drift across the dwell, so a still frame still breathes.
                scale: { duration: DWELL_MS / 1000 + 1.2, ease: 'linear' },
              }}
            >
              {/* Five of the six photographs are 3:4 and fill the frame
                  exactly. The odd landscape one is fitted rather than cropped,
                  because cover would cut the middle out of it. */}
              <Figure
                media={slide.media}
                alt={slide.caption}
                size="large"
                priority={index === 0}
                className="h-full w-full"
                imgClassName={isLandscape(slide.media) ? '!object-contain' : ''}
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </motion.div>
          </AnimatePresence>

          {/* Frame counter, set into the image like a contact sheet */}
          <div className="absolute top-0 left-0 z-10 flex items-center gap-2 bg-paper/90 px-2.5 py-1.5 backdrop-blur-sm">
            <span className="label tnum text-ink">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="label text-ink-faint">/ {String(slides.length).padStart(2, '0')}</span>
          </div>

          <div className="absolute right-0 bottom-0 z-10 bg-paper/90 px-2.5 py-1.5 backdrop-blur-sm">
            <span className="label">{slide.place}</span>
          </div>

          {/* Arrows appear on hover; the ticks below are always available */}
          <div className="pointer-events-none absolute inset-y-0 right-0 left-0 z-10 flex items-center justify-between px-2 opacity-0 transition-opacity duration-300 group-hover/car:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photograph"
              className="pointer-events-auto grid h-9 w-9 place-items-center border border-line-strong bg-paper/90 font-mono text-sm text-ink backdrop-blur-sm transition-colors hover:border-ink hover:bg-ink hover:text-paper"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photograph"
              className="pointer-events-auto grid h-9 w-9 place-items-center border border-line-strong bg-paper/90 font-mono text-sm text-ink backdrop-blur-sm transition-colors hover:border-ink hover:bg-ink hover:text-paper"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- Ticks ---------------- */}
      <div className="mt-2.5 flex gap-px" role="tablist" aria-label="Choose photograph">
        {slides.map((s, i) => (
          <button
            key={s.media}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`${s.kicker}, ${s.place}`}
            onClick={() => go(i)}
            className="group/tick relative h-5 flex-1 cursor-pointer"
          >
            <span
              className={`absolute inset-x-0 top-0 h-[3px] transition-colors ${
                i === index ? 'bg-signal' : 'bg-line group-hover/tick:bg-line-strong'
              }`}
            />
            {/* Fills across the dwell, so the pause is visible, not guessed */}
            {i === index && !reduced && !paused && (
              <motion.span
                key={`${index}-fill`}
                className="absolute top-0 left-0 h-[3px] origin-left bg-signal-deep"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: DWELL_MS / 1000, ease: 'linear' }}
                style={{ width: '100%' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ---------------- Caption ---------------- */}
      {/* Fixed height, clamped to three lines: the carousel sits inside the
          first screen, so it cannot be allowed to reflow the page as the
          caption length changes between slides. */}
      <div className="mt-2.5 min-h-[4.25rem]" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.media}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.45, ease: easePrecise }}
          >
            <p className="label label-signal">{slide.kicker}</p>
            <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug text-ink-soft">
              {slide.caption}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
