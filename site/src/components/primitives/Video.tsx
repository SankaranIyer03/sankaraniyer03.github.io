import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { MediaEntry } from '../../lib/media'
import { getVideo } from '../../lib/video'
import { easePrecise, usePrefersReducedMotion } from '../../lib/motion'

export interface VideoProps {
  /** Key into the generated video manifest, e.g. "terraprobe/sampling". */
  media: string
  /**
   * `loop` — short muted clip that plays itself while on screen (a GIF, done properly).
   * `player` — full demo; nothing is downloaded until the play control is pressed.
   */
  mode?: 'loop' | 'player'
  /** Accessible name for the clip, and the basis of the play control's label. */
  label: string
  caption?: string
  className?: string
  /** Load the poster eagerly — only for clips above the fold. */
  priority?: boolean
}

/** Seconds → `m:ss` (or `h:mm:ss` for anything over an hour). */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

const CAPTION_CLASS = 'border-t border-line px-4 py-2.5 text-[12.5px] text-ink-muted'

/** The drafting-square play control: hairline outline, no gloss. */
function PlayGlyph({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  const box = size === 'lg' ? 'h-14 w-14' : 'h-11 w-11'
  const tri = size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'
  return (
    <span
      className={`${box} grid place-items-center border border-ink bg-paper/85 text-ink transition-colors duration-200 group-hover:border-signal group-hover:bg-signal-wash group-hover:text-signal`}
    >
      <svg viewBox="0 0 12 14" className={`${tri} fill-current`} aria-hidden="true">
        <path d="M0 0 12 7 0 14Z" />
      </svg>
    </span>
  )
}

/** Poster frame, mirroring the encode ladder the Figure primitive uses. */
function Poster({ poster, priority }: { poster: MediaEntry; priority: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const sizes = '(max-width: 768px) 100vw, 50vw'

  return (
    <div className="absolute inset-0 overflow-hidden bg-paper-deep">
      <img
        src={poster.lqip}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full scale-110 object-cover blur-xl transition-opacity duration-700 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <picture>
        <source type="image/avif" srcSet={poster.midAvif} sizes={sizes} />
        <source
          type="image/webp"
          srcSet={`${poster.small} 480w, ${poster.mid} 1000w, ${poster.large} 1800w`}
          sizes={sizes}
        />
        <img
          src={poster.mid}
          alt=""
          aria-hidden="true"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`relative h-full w-full object-cover transition-opacity duration-700 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </picture>
    </div>
  )
}

/**
 * Video as a technical figure. Loop clips idle when off-screen; player clips
 * fetch nothing until asked. Aspect comes from the manifest, so a portrait
 * clip stays portrait and nothing reflows once bytes arrive.
 */
export function Video({
  media,
  mode = 'loop',
  label,
  caption,
  className = '',
  priority = false,
}: VideoProps) {
  const entry = getVideo(media)
  const reduced = usePrefersReducedMotion()

  const frameRef = useRef<HTMLDivElement | null>(null)
  const loopRef = useRef<HTMLVideoElement | null>(null)
  const playerRef = useRef<HTMLVideoElement | null>(null)

  // No observer (very old browser, or SSR) means "assume visible" rather than "never play".
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined')
  const [pageHidden, setPageHidden] = useState(
    () => typeof document !== 'undefined' && document.hidden,
  )
  /** Reduced-motion loops, and every player, wait for an explicit gesture. */
  const [started, setStarted] = useState(false)

  const isLoop = mode === 'loop'
  const wantsPlay = isLoop && inView && !pageHidden && (!reduced || started)

  // Only observe while a loop is mounted; a paused off-screen video costs nothing.
  useEffect(() => {
    if (!isLoop) return
    if (typeof IntersectionObserver === 'undefined') return
    const node = frameRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const record of entries) setInView(record.isIntersecting)
      },
      // Threshold 0 so a clip taller than the viewport still counts as visible.
      { threshold: 0, rootMargin: '96px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [isLoop])

  useEffect(() => {
    if (!isLoop) return
    const onVisibility = () => setPageHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [isLoop])

  useEffect(() => {
    const el = loopRef.current
    if (!el) return
    if (wantsPlay) void el.play().catch(() => {})
    else el.pause()
  }, [wantsPlay])

  // The gesture that mounted the player element also authorises sound.
  useEffect(() => {
    if (isLoop || !started) return
    const el = playerRef.current
    if (!el) return
    // The play control is about to unmount, so hand focus to the controls.
    el.focus({ preventScroll: true })
    void el.play().catch(() => {})
  }, [isLoop, started])

  if (!entry) {
    return (
      <figure className={`reg-marks relative border border-line bg-paper-deep ${className}`}>
        <div
          className="bp-grid grid aspect-16/10 place-items-center px-6 text-center"
          role="img"
          aria-label={`${label} — video unavailable`}
        >
          <div>
            <p className="label">Video slot — {label}</p>
            <p className="mt-2 font-mono text-[11px] text-ink-faint">missing · {media}</p>
          </div>
        </div>
        {caption && <figcaption className={CAPTION_CLASS}>{caption}</figcaption>}
      </figure>
    )
  }

  const aspect = entry.aspect && entry.aspect > 0 ? entry.aspect : 16 / 9
  const portrait = aspect < 1
  // Portrait clips keep their real shape; cap the column so they don't tower.
  const widthGuard = portrait && !/\bmax-w-/.test(className) ? 'mx-auto max-w-[22rem]' : ''
  const durationText = entry.duration === null ? null : formatDuration(entry.duration)
  const fade = { duration: reduced ? 0 : 0.45, ease: easePrecise }
  /** Loops only wait behind the poster under reduced motion; players always do. */
  const awaitingGesture = !started && (isLoop ? reduced : true)

  return (
    <figure className={`reg-marks relative border border-line bg-card ${widthGuard} ${className}`}>
      <div
        ref={frameRef}
        className="relative overflow-hidden bg-paper-deep"
        style={{ aspectRatio: String(aspect) }}
      >
        {isLoop ? (
          <video
            ref={loopRef}
            src={entry.mp4}
            poster={entry.poster.mid}
            aria-label={label}
            autoPlay={!reduced}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          started && (
            <video
              ref={playerRef}
              src={entry.mp4}
              poster={entry.poster.mid}
              aria-label={label}
              controls
              playsInline
              preload="auto"
              className="h-full w-full bg-ink object-contain"
            />
          )
        )}

        <AnimatePresence>
          {awaitingGesture && (
            <motion.div
              key="await-gesture"
              className="absolute inset-0"
              initial={false}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              <Poster poster={entry.poster} priority={priority} />

              <button
                type="button"
                onClick={() => setStarted(true)}
                aria-label={
                  durationText ? `Play ${label} — ${durationText}` : `Play ${label}`
                }
                className="group absolute inset-0 grid place-items-center"
              >
                <span className="flex flex-col items-center gap-3">
                  <PlayGlyph size={portrait ? 'sm' : 'lg'} />
                  <span className="label bg-paper/85 px-1.5 py-0.5">
                    {isLoop ? 'Play clip' : 'Play'}
                  </span>
                </span>
              </button>

              {durationText && (
                <span className="pointer-events-none absolute right-3 bottom-3 border border-line-strong bg-paper/90 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em] text-ink tnum">
                  {durationText}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {isLoop && !awaitingGesture && (
          <span className="pointer-events-none absolute right-3 bottom-3 flex items-center gap-1.5 bg-paper/85 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em] uppercase text-ink-muted">
            <span aria-hidden="true" className="h-1 w-1 bg-signal" />
            Loop
            {durationText && <span className="tnum text-ink-faint">{durationText}</span>}
          </span>
        )}
      </div>

      {caption && <figcaption className={CAPTION_CLASS}>{caption}</figcaption>}
    </figure>
  )
}
