import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { roles, type Role } from '../../content/experience'
import { getMedia } from '../../lib/media'
import { easePrecise, usePrefersReducedMotion, viewportOnce } from '../../lib/motion'

function Logo({ media, name, className = '' }: { media?: string; name: string; className?: string }) {
  const entry = media ? getMedia(media) : undefined
  if (!entry) return <span className={`label ${className}`}>{name}</span>
  return (
    <img
      src={entry.mid ?? entry.small}
      alt={name}
      loading="lazy"
      decoding="async"
      className={`object-contain ${className}`}
    />
  )
}

function year(role: Role) {
  return role.start.slice(0, 4)
}

interface EntryProps {
  role: Role
  open: boolean
  onToggle: () => void
  /** Set when this entry begins a new year, which gets a marker on the spine. */
  yearMarker?: string
}

function Entry({ role, open, onToggle, yearMarker }: EntryProps) {
  const reduced = usePrefersReducedMotion()

  return (
    <li className="relative">
      {yearMarker && (
        <div className="relative flex items-center gap-3 pt-10 pb-4 pl-12 first:pt-0 md:pl-16">
          <span className="absolute left-0 flex h-6 w-6 items-center justify-center md:left-1">
            <span className="h-px w-4 bg-line-strong" />
          </span>
          <span className="font-mono text-[13px] font-medium tracking-[0.1em] text-ink tnum">
            {yearMarker}
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>
      )}

      <motion.article
        initial={reduced ? { opacity: 1 } : { opacity: 0, x: -12 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 0.6, ease: easePrecise }}
        className="group relative pb-2 pl-12 md:pl-16"
      >
        {/* Node on the spine. Highlighted roles get a filled marker. */}
        <span className="absolute top-[0.55rem] left-0 grid h-6 w-6 place-items-center md:left-1">
          <span
            className={`h-[9px] w-[9px] rotate-45 border transition-colors duration-300 ${
              role.highlight
                ? 'border-signal bg-signal'
                : 'border-line-strong bg-paper group-hover:border-ink'
            }`}
          />
        </span>

        <div className="border-b border-line pb-7">
          <div className="flex items-start gap-4 md:gap-5">
            <Logo
              media={role.logo}
              name={role.company}
              className="mt-0.5 h-12 w-12 shrink-0 object-contain md:h-14 md:w-14"
            />
            <div className="min-w-0">
              <p className="label">
                {role.period}
                {role.internship && (
                  <>
                    <span className="mx-2 text-ink-faint">·</span>
                    Internship
                  </>
                )}
              </p>
              <h3 className="mt-1.5 text-[1.15rem] leading-tight font-medium tracking-[-0.015em] md:text-[1.3rem]">
                {role.title}
              </h3>
              <p className="mt-1 text-[14px] text-ink-muted">{role.company}</p>
            </div>
          </div>

          {/* The headline is never collapsed, it is the point of the role. */}
          <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-ink">{role.headline}</p>

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="mt-5 inline-flex items-center gap-2 border-b border-line-strong pb-1 font-mono text-[11px] tracking-[0.12em] uppercase text-ink-muted transition-colors hover:border-ink hover:text-ink"
          >
            {open ? 'Hide detail' : 'What I did'}
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.3 }}>
              ↓
            </motion.span>
          </button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.45, ease: easePrecise }}
                className="overflow-hidden"
              >
                <ol className="mt-6 grid grid-cols-1 gap-x-10 gap-y-4 lg:grid-cols-3">
                  {role.bullets.map((bullet, i) => (
                    <li key={i} className="border-t border-line pt-3">
                      <span className="label tnum">{String(i + 1).padStart(2, '0')}</span>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{bullet}</p>
                    </li>
                  ))}
                </ol>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.article>
    </li>
  )
}

/**
 * Vertical timeline, newest first. The spine is a single continuous element
 * behind every entry rather than a border per row, so it draws itself once on
 * scroll and reads as one career instead of eight unrelated jobs.
 */
export function VerticalTimeline() {
  const [openId, setOpenId] = useState<string | null>(roles[0]?.id ?? null)
  const reduced = usePrefersReducedMotion()

  /* A year marker is drawn on the first entry of each year. Derived up front
     rather than by mutating a counter inside the map, so the result does not
     depend on render order. */
  const entries = roles.map((role, i) => ({
    role,
    yearMarker: i === 0 || year(role) !== year(roles[i - 1]) ? year(role) : undefined,
  }))

  return (
    <div className="relative">
      {/* Spine */}
      <motion.span
        aria-hidden="true"
        className="absolute top-2 bottom-2 left-[11px] w-px origin-top bg-line-strong md:left-[15px]"
        initial={reduced ? { scaleY: 1 } : { scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.8, ease: easePrecise }}
      />

      <ol className="relative">
        {entries.map(({ role, yearMarker }) => (
          <Entry
            key={role.id}
            role={role}
            yearMarker={yearMarker}
            open={openId === role.id}
            onToggle={() => setOpenId(openId === role.id ? null : role.id)}
          />
        ))}
      </ol>
    </div>
  )
}
