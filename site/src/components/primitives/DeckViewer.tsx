import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { easePrecise, usePrefersReducedMotion } from '../../lib/motion'

export function DeckViewer({
  label,
  href,
  slides,
  size,
  download = true,
}: {
  label: string
  href?: string
  slides: string[]
  size?: string
  download?: boolean
}) {
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  const go = useCallback(
    (next: number) => {
      const i = ((next % slides.length) + slides.length) % slides.length
      setDirection(next > index || (index === slides.length - 1 && i === 0) ? 1 : -1)
      setIndex(i)
    },
    [index, slides.length],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault()
      go(index + 1)
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault()
      go(index - 1)
    }
    if (e.key === 'Home') {
      e.preventDefault()
      go(0)
    }
    if (e.key === 'End') {
      e.preventDefault()
      go(slides.length - 1)
    }
  }

  const current = String(index + 1).padStart(2, '0')
  const total = String(slides.length).padStart(2, '0')
  const src = slides[index]

  return (
    <div
      className="reg-marks relative border border-line bg-card"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-5">
        <div>
          <p className="text-[15px] font-medium tracking-[-0.015em]">{label}</p>
          <p className="mt-1 font-mono text-[11px] tracking-[0.12em] text-ink-muted uppercase tnum">
            Slide {current} / {total}
          </p>
        </div>
        {download && href ? (
          <a
            href={href}
            download
            className="inline-flex items-center gap-2 border border-line-strong px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] uppercase transition-colors hover:border-ink hover:text-signal"
          >
            Download{size ? ` · ${size}` : ''}
            <span aria-hidden="true">↓</span>
          </a>
        ) : null}
      </header>

      <div className="relative overflow-hidden bg-paper-deep">
        <div className="relative aspect-16/9">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.img
              key={src}
              src={src}
              alt={`${label}, slide ${index + 1} of ${slides.length}`}
              width={1440}
              height={810}
              custom={direction}
              initial={reduced ? { opacity: 0 } : { opacity: 0, x: direction * 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, x: direction * -32 }}
              transition={{ duration: reduced ? 0.15 : 0.35, ease: easePrecise }}
              className="absolute inset-0 h-full w-full object-contain"
            />
          </AnimatePresence>
          {slides[(index + 1) % slides.length] && (
            <img
              src={slides[(index + 1) % slides.length]}
              alt=""
              aria-hidden="true"
              className="hidden"
            />
          )}
        </div>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 md:px-5">
        <button
          type="button"
          onClick={() => go(index - 1)}
          className="w-16 shrink-0 text-left font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted transition-colors hover:text-signal"
        >
          ← Prev
        </button>
        {slides.length <= 12 ? (
          <div className="hidden min-w-0 flex-1 items-center justify-center gap-1.5 overflow-hidden sm:flex">
            {slides.map((slide, i) => (
              <button
                key={slide}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => go(i)}
                className={`h-1.5 shrink-0 transition-all ${
                  i === index ? 'w-6 bg-signal' : 'w-1.5 bg-line-strong hover:bg-ink-muted'
                }`}
              />
            ))}
          </div>
        ) : (
          <p className="min-w-0 flex-1 truncate text-center font-mono text-[11px] tracking-[0.12em] text-ink-muted uppercase tnum">
            {current} / {total}
          </p>
        )}
        <button
          type="button"
          onClick={() => go(index + 1)}
          className="w-16 shrink-0 text-right font-mono text-[11px] tracking-[0.1em] uppercase text-ink-muted transition-colors hover:text-signal"
        >
          Next →
        </button>
      </footer>
    </div>
  )
}
