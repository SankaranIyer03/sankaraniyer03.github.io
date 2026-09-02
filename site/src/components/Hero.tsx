import { motion } from 'motion/react'
import { LoopScene } from './hero/LoopScene'
import { profile } from '../content/profile'
import { acts } from '../content/acts'
import { easePrecise, riseIn, staggerParent, usePrefersReducedMotion } from '../lib/motion'
import { scrollTo } from '../lib/useSmoothScroll'

const headlineLines = [profile.headline.lead, ...profile.headline.beats]

export function Hero() {
  const reduced = usePrefersReducedMotion()

  return (
    <section id="top" className="relative overflow-hidden border-b border-line">
      {/* Blueprint substrate, faded out toward the edges */}
      <div className="bp-grid bp-mask pointer-events-none absolute inset-0 opacity-70" />

      <div className="relative mx-auto grid max-w-[1600px] grid-cols-1 items-center gap-8 px-6 pt-28 pb-16 md:px-10 lg:min-h-[92vh] lg:grid-cols-12 lg:gap-4 lg:pt-32 lg:pb-24">
        {/* ---------------- Identity ---------------- */}
        <motion.div
          className="lg:col-span-7 xl:col-span-6"
          variants={staggerParent}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={riseIn} className="flex items-center gap-3">
            <span className="label">{profile.name}</span>
            <span className="h-px w-8 bg-line-strong" />
            <span className="label label-signal">{profile.role}</span>
          </motion.div>

          <h1 className="mt-7 text-[clamp(2.6rem,7.2vw,5.6rem)] leading-[0.95] font-medium tracking-[-0.035em]">
            {headlineLines.map((line, i) => (
              <motion.span
                key={line}
                className="block"
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 28, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.13, ease: easePrecise }}
              >
                <span className="mr-3 align-super font-mono text-[0.28em] font-medium tracking-normal text-ink-faint tnum">
                  {acts[i].code}
                </span>
                {line}
              </motion.span>
            ))}
          </h1>

          <motion.div
            variants={riseIn}
            className="mt-9 max-w-xl border-l border-signal pl-5"
          >
            <p className="text-lg leading-relaxed text-ink-soft md:text-xl">
              {profile.tagline}
            </p>
          </motion.div>

          <motion.p
            variants={riseIn}
            className="mt-6 max-w-xl text-[15px] leading-relaxed text-ink-muted"
          >
            {profile.standfirst}
          </motion.p>

          {/* Education, stated plainly — it is a credential, not a headline */}
          <motion.dl variants={riseIn} className="mt-9 flex flex-wrap gap-x-10 gap-y-4">
            {profile.education.map((ed) => (
              <div key={ed.school}>
                <dt className="label">{ed.abbr}</dt>
                <dd className="mt-1 text-sm text-ink">{ed.degree}</dd>
                <dd className="text-sm text-ink-muted">{ed.focus}</dd>
              </div>
            ))}
          </motion.dl>

          <motion.div variants={riseIn} className="mt-10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => scrollTo('#thesis')}
              className="group relative inline-flex items-center gap-3 border border-ink bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:bg-signal hover:border-signal"
            >
              Follow the loop
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
            <button
              type="button"
              onClick={() => scrollTo('#work')}
              className="inline-flex items-center gap-3 border border-line-strong px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-card"
            >
              Selected work
            </button>
          </motion.div>
        </motion.div>

        {/* ---------------- The loop ---------------- */}
        <motion.div
          className="relative lg:col-span-5 xl:col-span-6"
          initial={reduced ? { opacity: 1 } : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: easePrecise, delay: 0.2 }}
        >
          <div className="relative mx-auto aspect-square w-full max-w-[640px]">
            <LoopScene />
          </div>

          <div className="mx-auto mt-6 max-w-[430px] px-4 text-center">
            <p className="label">Fig. 01 — the closed loop</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              {profile.thesis.loopStatement}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        className="relative mx-auto flex max-w-[1600px] items-center gap-4 px-6 pb-8 md:px-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
      >
        <span className="label">Scroll</span>
        <span className="h-px flex-1 bg-line" />
        <motion.span
          className="font-mono text-xs text-ink-faint"
          animate={reduced ? {} : { y: [0, 4, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          ↓
        </motion.span>
      </motion.div>
    </section>
  )
}
