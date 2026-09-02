import { lazy, Suspense } from 'react'
import { motion } from 'motion/react'
import { acts } from '../../content/acts'
import { profile } from '../../content/profile'
import { StaticLoop } from '../hero/StaticLoop'
import { riseIn, staggerParent, viewportOnce } from '../../lib/motion'

/* ~330 kB gzipped of WebGL. It waits until the section is reachable. */
const LoopScene = lazy(() => import('../hero/LoopScene').then((m) => ({ default: m.LoopScene })))

/**
 * The thesis, compressed to what someone will actually read: one claim, four
 * questions, one diagram. The long-form argument lives on the project pages,
 * where a reader has already opted in.
 */
export function TheLoop() {
  return (
    <section id="loop" className="relative overflow-hidden border-b border-line py-20 md:py-28">
      <div className="bp-grid bp-mask pointer-events-none absolute inset-0 opacity-50" />

      <div className="relative mx-auto grid max-w-[1600px] grid-cols-1 items-center gap-14 px-6 md:px-10 lg:grid-cols-12 lg:gap-10">
        <motion.div
          className="lg:col-span-6 xl:col-span-5"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <motion.div variants={riseIn} className="flex items-center gap-4">
            <span className="label tnum">01</span>
            <span className="h-px w-16 bg-line-strong" />
            <span className="label label-signal">How I work</span>
          </motion.div>

          <motion.h2
            variants={riseIn}
            className="mt-6 text-[clamp(1.9rem,4vw,3.2rem)] leading-[1.06] font-medium tracking-[-0.03em]"
          >
            Most engineers own one stage.
            <br />
            <span className="text-signal">I own the handoffs.</span>
          </motion.h2>

          <motion.p
            variants={riseIn}
            className="mt-7 max-w-xl text-[16px] leading-relaxed text-ink-soft"
          >
            {profile.thesis.loopStatement}
          </motion.p>

          <motion.ol variants={staggerParent} className="mt-10 border-t border-line">
            {acts.map((act) => (
              <motion.li
                key={act.id}
                variants={riseIn}
                className="group flex items-baseline gap-5 border-b border-line py-4"
              >
                <span className="label tnum shrink-0 transition-colors group-hover:text-signal">
                  {act.code}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[1.05rem] font-medium tracking-[-0.01em]">{act.verb}</h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">
                    {act.question}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </motion.div>

        <motion.div
          className="lg:col-span-6 lg:col-start-7 xl:col-span-6 xl:col-start-7"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative mx-auto aspect-square w-full max-w-[600px]">
            <Suspense fallback={<StaticLoop />}>
              <LoopScene />
            </Suspense>
          </div>
          <p className="label mt-2 text-center">Fig. 01 — the closed loop</p>
        </motion.div>
      </div>
    </section>
  )
}
