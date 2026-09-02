import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { getMedia } from '../../lib/media'
import { easePrecise } from '../../lib/motion'
import { Figure } from './Figure'

interface GalleryProps {
  keys: string[]
  label: string
}

/**
 * Contact-sheet gallery with a keyboard-navigable lightbox. Replaces the old
 * site's Lightbox2 + jQuery dependency.
 */
export function Gallery({ keys, label }: GalleryProps) {
  const [open, setOpen] = useState<number | null>(null)

  const close = useCallback(() => setOpen(null), [])
  const step = useCallback(
    (delta: number) => setOpen((i) => (i === null ? null : (i + delta + keys.length) % keys.length)),
    [keys.length],
  )

  useEffect(() => {
    if (open === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, close, step])

  if (!keys.length) return null

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
        {keys.map((key, i) => (
          <button
            key={key}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative overflow-hidden border border-line transition-colors hover:border-ink focus-visible:border-signal"
            aria-label={`${label} — open image ${i + 1} of ${keys.length}`}
          >
            <Figure
              media={key}
              alt={`${label} ${i + 1}`}
              size="small"
              className="aspect-4/3"
              imgClassName="transition-transform duration-700 group-hover:scale-[1.04]"
              sizes="(max-width: 640px) 33vw, 16vw"
            />
            <span className="absolute bottom-1 left-1 bg-paper/90 px-1 font-mono text-[9px] tracking-wider text-ink-muted tnum">
              {String(i + 1).padStart(2, '0')}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {open !== null && (
          <motion.div
            className="fixed inset-0 z-100 flex flex-col bg-paper/97 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            role="dialog"
            aria-modal="true"
            aria-label={`${label} image viewer`}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="label">
                {label} · <span className="tnum">{String(open + 1).padStart(2, '0')}</span> /{' '}
                <span className="tnum">{String(keys.length).padStart(2, '0')}</span>
              </span>
              <button
                type="button"
                onClick={close}
                className="border border-line-strong px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors hover:border-ink hover:bg-card"
              >
                Close esc
              </button>
            </div>

            <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4 sm:p-10">
              <motion.img
                key={keys[open]}
                src={getMedia(keys[open])?.large}
                alt={`${label} ${open + 1}`}
                className="max-h-full max-w-full object-contain"
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: easePrecise }}
              />

              <button
                type="button"
                onClick={() => step(-1)}
                className="absolute left-2 grid h-11 w-11 place-items-center border border-line-strong bg-paper/80 transition-colors hover:border-ink sm:left-6"
                aria-label="Previous image"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                className="absolute right-2 grid h-11 w-11 place-items-center border border-line-strong bg-paper/80 transition-colors hover:border-ink sm:right-6"
                aria-label="Next image"
              >
                →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
