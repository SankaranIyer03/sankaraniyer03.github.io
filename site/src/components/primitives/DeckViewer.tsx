import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { easePrecise, usePrefersReducedMotion } from '../../lib/motion'
import type { Doc } from '../../content/projects'

export function DeckViewer({
  label,
  slides,
  kind = 'deck',
}: {
  label: string
  slides: string[]
  kind?: Doc['kind']
}) {
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<(HTMLImageElement | null)[]>([])
  const documentLike = kind === 'paper' || kind === 'schematic'
  const unit = documentLike ? 'Page' : 'Slide'

  const scrollToPage = useCallback((i: number) => {
    pageRefs.current[i]?.scrollIntoView({ block: 'start' })
  }, [])

  const go = useCallback(
    (next: number) => {
      const i = ((next % slides.length) + slides.length) % slides.length
      setDirection(next > index || (index === slides.length - 1 && i === 0) ? 1 : -1)
      setIndex(i)
      if (open && documentLike) scrollToPage(i)
    },
    [documentLike, index, open, scrollToPage, slides.length],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
      return
    }
    if (e.key === 'ArrowRight' || (!open && (e.key === 'ArrowDown' || e.key === 'PageDown'))) {
      e.preventDefault()
      go(index + 1)
    }
    if (e.key === 'ArrowLeft' || (!open && (e.key === 'ArrowUp' || e.key === 'PageUp'))) {
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

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    stageRef.current?.focus()
    const onWindowKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onWindowKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onWindowKey)
    }
  }, [open])

  useEffect(() => {
    if (!open || documentLike) return
    stageRef.current?.scrollTo({ top: 0 })
  }, [documentLike, index, open])

  const onStageScroll = () => {
    if (!documentLike) return
    const stage = stageRef.current
    if (!stage) return
    const marker = stage.scrollTop + 48
    let current = 0
    pageRefs.current.forEach((page, i) => {
      if (page && page.offsetTop <= marker) current = i
    })
    setIndex(current)
  }

  const current = String(index + 1).padStart(2, '0')
  const total = String(slides.length).padStart(2, '0')
  const src = slides[index]
  const nextSrc = slides[(index + 1) % slides.length]

  const Controls = () => (
    <>
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
              aria-label={`Go to ${unit.toLowerCase()} ${i + 1}`}
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
    </>
  )

  return (
    <>
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
              {unit} {current} / {total}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="label shrink-0 transition-colors hover:text-signal"
          >
            View
          </button>
        </header>

        <div className="relative overflow-hidden bg-paper-deep">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative block aspect-16/9 w-full cursor-zoom-in"
            aria-label={`View ${label} larger`}
          >
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.img
                key={src}
                src={src}
                alt={`${label}, ${unit.toLowerCase()} ${index + 1} of ${slides.length}`}
                width={1440}
                height={810}
                custom={direction}
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: direction * 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: direction * -32 }}
                transition={{ duration: reduced ? 0.15 : 0.35, ease: easePrecise }}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="absolute inset-0 h-full w-full object-contain"
              />
            </AnimatePresence>
            {nextSrc && (
              <img src={nextSrc} alt="" aria-hidden="true" className="hidden" />
            )}
          </button>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 md:px-5">
          <Controls />
        </footer>
      </div>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] grid place-items-center bg-ink/75 p-6 md:p-10 lg:p-16"
            onClick={() => setOpen(false)}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={label}
              tabIndex={-1}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={onKeyDown}
              className="flex h-[min(78vh,40rem)] w-full max-w-4xl flex-col border border-line bg-card outline-none"
            >
              <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 md:px-5">
                <div>
                  <p className="text-[15px] font-medium tracking-[-0.015em]">{label}</p>
                  <p className="mt-1 font-mono text-[11px] tracking-[0.12em] text-ink-muted uppercase tnum">
                    {unit} {current} / {total}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="label shrink-0 transition-colors hover:text-signal"
                >
                  Close
                </button>
              </header>

              <div
                ref={stageRef}
                tabIndex={0}
                onScroll={onStageScroll}
                onKeyDown={onKeyDown}
                className={`min-h-0 flex-1 overscroll-contain bg-paper-deep p-5 outline-none md:p-8 ${
                  documentLike
                    ? 'overflow-y-auto'
                    : 'grid place-items-center overflow-hidden'
                }`}
              >
                {documentLike ? (
                  <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
                    {slides.map((slide, i) => (
                      <img
                        key={slide}
                        ref={(el) => {
                          pageRefs.current[i] = el
                        }}
                        src={slide}
                        alt={`${label}, page ${i + 1} of ${slides.length}`}
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        className="block w-full"
                      />
                    ))}
                  </div>
                ) : (
                  <img
                    src={src}
                    alt={`${label}, slide ${index + 1} of ${slides.length}`}
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                    className="mx-auto block max-h-full max-w-full object-contain"
                  />
                )}
              </div>

              <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-line px-4 py-3 md:px-5">
                <Controls />
              </footer>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
