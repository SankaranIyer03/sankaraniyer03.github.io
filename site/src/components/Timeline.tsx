import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { acts, type ActId } from '../content/acts'
import { companyLogos, leadership, roles } from '../content/experience'
import { getMedia } from '../lib/media'
import { easePrecise, riseIn, staggerParent, viewportOnce } from '../lib/motion'
import { SectionHead } from './primitives/SectionHead'

type Filter = ActId | 'all'

function Logo({ media, name, className = '' }: { media?: string; name: string; className?: string }) {
  const entry = media ? getMedia(media) : undefined
  if (!entry) {
    return <span className={`label ${className}`}>{name}</span>
  }
  return (
    <img
      src={entry.small}
      alt={name}
      loading="lazy"
      decoding="async"
      className={`object-contain ${className}`}
    />
  )
}

export function Timeline() {
  const [filter, setFilter] = useState<Filter>('all')
  const [openId, setOpenId] = useState<string | null>(roles[1]?.id ?? null)

  const visible = filter === 'all' ? roles : roles.filter((r) => r.acts.includes(filter))

  return (
    <section id="experience" className="border-b border-line">
      <div className="mx-auto max-w-[1600px] px-6 py-24 md:px-10 md:py-32">
        <SectionHead
          index="04"
          kicker="Experience"
          title="Six organisations, one thread."
          lede="Aerospace manufacturing, industrial automation consulting, and a valve shop floor I first walked as a high-school intern. Filter by stage to see how the loop shows up in the work history."
        />

        {/* Stage filter — the loop as a lens on the career */}
        <motion.div
          className="mt-12 flex flex-wrap gap-2"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <motion.button
            variants={riseIn}
            type="button"
            onClick={() => setFilter('all')}
            aria-pressed={filter === 'all'}
            className={`border px-4 py-2 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors ${
              filter === 'all'
                ? 'border-ink bg-ink text-paper'
                : 'border-line-strong text-ink-muted hover:border-ink hover:text-ink'
            }`}
          >
            All roles
          </motion.button>
          {acts.map((act) => {
            const count = roles.filter((r) => r.acts.includes(act.id)).length
            const on = filter === act.id
            return (
              <motion.button
                variants={riseIn}
                key={act.id}
                type="button"
                onClick={() => setFilter(act.id)}
                aria-pressed={on}
                className={`border px-4 py-2 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors ${
                  on
                    ? 'border-signal bg-signal text-paper'
                    : 'border-line-strong text-ink-muted hover:border-ink hover:text-ink'
                }`}
              >
                {act.verb} <span className="tnum opacity-60">{count}</span>
              </motion.button>
            )
          })}
        </motion.div>

        {/* Roles */}
        <div className="mt-14 border-t border-line-strong">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((role) => {
              const open = openId === role.id
              return (
                <motion.article
                  key={role.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4, ease: easePrecise }}
                  className="border-b border-line"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : role.id)}
                    aria-expanded={open}
                    className="group grid w-full grid-cols-1 items-start gap-x-8 gap-y-3 py-7 text-left md:grid-cols-12"
                  >
                    <div className="flex items-center gap-4 md:col-span-3">
                      <span
                        className={`h-2 w-2 shrink-0 border transition-colors ${
                          role.highlight
                            ? 'border-signal bg-signal'
                            : 'border-line-strong bg-transparent group-hover:border-ink'
                        }`}
                      />
                      <Logo media={role.logo} name={role.company} className="h-7 max-w-[110px]" />
                    </div>

                    <div className="md:col-span-6">
                      <h3 className="text-[1.15rem] leading-tight font-medium tracking-tight">
                        {role.title}
                      </h3>
                      <p className="mt-1 text-sm text-ink-muted">{role.company}</p>
                    </div>

                    <div className="flex items-center justify-between gap-4 md:col-span-3">
                      <span className="font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
                        {role.period}
                      </span>
                      <motion.span
                        className="font-mono text-xs text-ink-faint"
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ duration: 0.3, ease: easePrecise }}
                      >
                        ↓
                      </motion.span>
                    </div>
                  </button>

                  {/* The headline sits outside the collapse — it is the point of the role */}
                  <p className="max-w-4xl pb-7 text-[15px] leading-relaxed text-ink md:ml-[calc(25%+0rem)] md:pl-0">
                    {role.headline}
                  </p>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.45, ease: easePrecise }}
                        className="overflow-hidden"
                      >
                        <ul className="grid grid-cols-1 gap-x-10 gap-y-4 pb-8 md:ml-[25%] lg:grid-cols-3">
                          {role.bullets.map((bullet, i) => (
                            <li key={i} className="border-t border-line pt-3">
                              <span className="label tnum">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
                                {bullet}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              )
            })}
          </AnimatePresence>
        </div>

        {/* ---- Leadership & research ---- */}
        <div className="mt-24">
          <p className="label">Project & leadership</p>
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {leadership.map((item) => (
              <motion.article
                key={item.id}
                variants={riseIn}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                className="reg-marks relative border border-line bg-card p-6 md:p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[1.2rem] leading-tight font-medium tracking-tight">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-ink-muted">{item.org}</p>
                  </div>
                  <Logo media={item.logo} name={item.org} className="h-8 max-w-[80px] shrink-0" />
                </div>
                <p className="label mt-4">{item.period}</p>
                <ul className="mt-5">
                  {item.bullets.map((bullet, i) => (
                    <li key={i} className="border-t border-line py-3">
                      <p className="text-[13.5px] leading-relaxed text-ink-soft">{bullet}</p>
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
        </div>

        {/* ---- Logo strip ---- */}
        <div className="mt-20 border-t border-line pt-10">
          <p className="label">Worked with</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-12 gap-y-8">
            {companyLogos.map((company) => (
              <Logo
                key={company.name}
                media={company.logo}
                name={company.name}
                className="h-9 max-w-[130px] opacity-55 transition-opacity duration-300 hover:opacity-100 md:h-11"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
