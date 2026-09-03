import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { acts, type ActId } from '../../content/acts'
import { StaticLoop } from '../hero/StaticLoop'
import { Figure } from '../primitives/Figure'
import { easePrecise, riseIn, staggerParent, viewportOnce } from '../../lib/motion'

/* ~330 kB gzipped of WebGL. It waits until the section is reachable. */
const LoopScene = lazy(() => import('../hero/LoopScene').then((m) => ({ default: m.LoopScene })))

/**
 * The argument of the site, made interactive. Four pillars, one loop: picking
 * a pillar lights its arc, its spoke and its node on the diagram, so the claim
 * "these are one system, not four skills" is demonstrated rather than asserted.
 *
 * Selection is click-driven rather than hover-driven, hover would make the
 * diagram twitchy and would be unusable on touch or by keyboard.
 */
export function HowIWork() {
  const [active, setActive] = useState<ActId | null>(null)

  const toggle = (id: ActId) => {
    setActive((current) => (current === id ? null : id))
  }

  return (
    <section id="how" className="relative overflow-hidden border-b border-line py-20 md:py-28">
      <div className="bp-grid bp-mask pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative mx-auto max-w-[1600px] px-6 md:px-10">
        {/* ---------------- Header ---------------- */}
        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <motion.div variants={riseIn} className="flex items-center gap-4">
            <span className="label tnum">02</span>
            <span className="h-px w-16 bg-line-strong" />
            <span className="label label-signal">How I work</span>
          </motion.div>

          <motion.h2
            variants={riseIn}
            className="mt-6 max-w-5xl text-[clamp(1.9rem,4vw,3.2rem)] leading-[1.06] font-medium tracking-[-0.03em]"
          >
            Four stages, one system.{' '}
            <span className="text-signal">The handoffs are the work.</span>
          </motion.h2>

          <motion.div
            variants={riseIn}
            className="mt-8 grid grid-cols-1 gap-6 text-[16px] leading-relaxed text-ink-soft md:grid-cols-3 md:gap-10"
          >
            <p>
              A product moves through stages in its lifecycle. The handoffs, the connections and
              the systems between them are what decide whether it actually ships.
            </p>
            <p>
              I have built my experience across{' '}
              <span className="text-ink">
                Design → Manufacture → Digital Thread → Business Value.
              </span>
            </p>
            <p>
              The question I keep asking:{' '}
              <strong className="font-semibold text-ink">
                how do we use data, AI and technology to better connect manufacturing, supply
                chain and operations?
              </strong>
            </p>
          </motion.div>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-10">
          {/* ---------------- Diagram ---------------- */}
          <motion.div
            className="lg:col-span-5"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 1.1, ease: easePrecise }}
          >
            <div className="lg:sticky lg:top-28">
              <div className="relative mx-auto aspect-square w-full max-w-[520px]">
                <Suspense fallback={<StaticLoop />}>
                  <LoopScene active={active} onSelect={toggle} />
                </Suspense>
              </div>
              <div className="mx-auto mt-2 flex max-w-[520px] items-baseline justify-between gap-4">
                <span className="label">Fig. 01, the closed loop</span>
                <span className="label text-ink-faint">Select a node</span>
              </div>
            </div>
          </motion.div>

          {/* ---------------- Pillars ---------------- */}
          <motion.ol
            className="lg:col-span-7 lg:col-start-6"
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            {acts.map((act, i) => {
              const open = act.id === active
              return (
                <motion.li key={act.id} variants={riseIn} className="border-t border-line last:border-b">
                  <h3>
                    <button
                      type="button"
                      onClick={() => toggle(act.id)}
                      aria-expanded={open}
                      aria-controls={`how-${act.id}`}
                      className="group flex w-full items-center gap-5 py-5 text-left"
                    >
                      <span
                        className={`label tnum shrink-0 transition-colors ${
                          open ? 'label-signal' : 'group-hover:text-ink'
                        }`}
                      >
                        {act.code}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[1.15rem] font-medium tracking-[-0.015em] transition-colors md:text-[1.3rem] ${
                            open ? 'text-signal' : 'text-ink'
                          }`}
                        >
                          {act.name}
                        </span>
                        <span className="mt-1.5 block text-[14px] leading-snug text-ink-muted">
                          {act.claim}
                        </span>
                      </span>
                      <span
                        className={`inline-flex shrink-0 items-center gap-2 border px-3 py-2 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors duration-300 ${
                          open
                            ? 'border-signal bg-signal text-paper'
                            : 'border-signal text-signal group-hover:bg-signal group-hover:text-paper'
                        }`}
                      >
                        {open ? 'Close' : 'Click me'}
                        <span
                          aria-hidden="true"
                          className={`inline-block transition-transform duration-300 ${
                            open ? 'rotate-90' : 'translate-x-0.5'
                          }`}
                        >
                          →
                        </span>
                      </span>
                    </button>
                  </h3>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        id={`how-${act.id}`}
                        key="body"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.5, ease: easePrecise }}
                        className="overflow-hidden"
                      >
                        <div className="pb-7 pl-0 sm:pl-[3.25rem]">
                          <Figure
                            media={act.photo.media}
                            alt={act.photo.alt}
                            size="small"
                            className="mx-auto aspect-4/3 w-full max-w-[220px] border border-line"
                            sizes="220px"
                          />

                          <p className="label mt-7">Core Capability</p>
                          {/* Bordered chips rather than a gap-px grid: a wrapping
                              flex row leaves dead space on its last line, which a
                              coloured parent would show as a grey block. */}
                          <ul className="mt-3 flex flex-wrap gap-1.5">
                            {act.tools.map((tool) => (
                              <li
                                key={tool}
                                className="border border-line bg-card px-3 py-2 font-mono text-[11.5px] tracking-tight text-ink-soft"
                              >
                                {tool}
                              </li>
                            ))}
                          </ul>

                          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                            <Link
                              to={`/projects?act=${act.id}`}
                              className="group inline-flex items-center gap-3 border border-ink bg-ink px-5 py-2.5 text-[13px] font-medium text-paper transition-colors hover:border-signal hover:bg-signal"
                            >
                              View {act.name.toLowerCase()} projects
                              <span className="transition-transform duration-300 group-hover:translate-x-1">
                                →
                              </span>
                            </Link>
                            {/* The handoff is the load-bearing claim, so it is
                                stated on every pillar rather than implied. */}
                            <span className="flex items-baseline gap-2 text-[12.5px] text-ink-muted">
                              <span className="label label-signal">
                                → {acts[(i + 1) % acts.length].code}
                              </span>
                              {act.handoff}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              )
            })}
          </motion.ol>
        </div>
      </div>
    </section>
  )
}
