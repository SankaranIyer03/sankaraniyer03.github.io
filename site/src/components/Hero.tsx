import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { profile } from '../content/profile'
import { acts } from '../content/acts'
import { Figure } from './primitives/Figure'
import { easePrecise, riseIn, staggerParent, usePrefersReducedMotion } from '../lib/motion'
import { scrollTo } from '../lib/useSmoothScroll'

const headlineLines = [profile.headline.lead, ...profile.headline.beats]

/**
 * First screen. The job is to answer "who is this and are they credible"
 * before anyone decides to scroll — so the positioning sentence and a real
 * photograph outrank anything decorative. The 3D loop waits for section 01.
 */
export function Hero() {
  const reduced = usePrefersReducedMotion()

  return (
    <section id="top" className="relative overflow-hidden border-b border-line">
      <div className="bp-grid bp-mask pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative mx-auto grid max-w-[1600px] grid-cols-1 items-center gap-12 px-6 pt-28 pb-16 md:px-10 lg:min-h-[88vh] lg:grid-cols-12 lg:gap-12 lg:pt-32 lg:pb-20">
        {/* ---------------- Identity ---------------- */}
        <motion.div
          className="lg:col-span-7"
          variants={staggerParent}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={riseIn} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="label">{profile.name}</span>
            <span className="h-px w-8 bg-line-strong" />
            <span className="label label-signal">{profile.role}</span>
          </motion.div>

          <h1 className="mt-7 text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.98] font-medium tracking-[-0.035em]">
            {headlineLines.map((line, i) => (
              <motion.span
                key={line}
                className="block"
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 26, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.85, delay: 0.12 + i * 0.11, ease: easePrecise }}
              >
                <span className="mr-3 align-super font-mono text-[0.26em] font-medium tracking-normal text-ink-faint tnum">
                  {acts[i].code}
                </span>
                {line}
              </motion.span>
            ))}
          </h1>

          {/* The sentence that decides whether the rest gets read */}
          <motion.p
            variants={riseIn}
            className="mt-9 max-w-2xl border-l border-signal pl-5 text-[17px] leading-relaxed text-ink-soft md:text-[19px]"
          >
            {profile.standfirst}
          </motion.p>

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
              onClick={() => scrollTo('#work')}
              className="group inline-flex items-center gap-3 border border-ink bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:border-signal hover:bg-signal"
            >
              See the work
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>
            <Link
              to="/work/rc-car-drivetrain"
              className="inline-flex items-center gap-3 border border-line-strong px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-card"
            >
              Start with the flagship
            </Link>
          </motion.div>
        </motion.div>

        {/* ---------------- Portrait ---------------- */}
        <motion.figure
          className="reg-marks relative lg:col-span-5"
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: easePrecise, delay: 0.3 }}
        >
          <div className="border border-line bg-card p-2.5">
            <Figure
              media={profile.floorPhoto}
              alt={`${profile.name} on a manufacturing floor`}
              size="large"
              priority
              className="aspect-4/5 w-full"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </div>
          <figcaption className="mt-3 flex items-baseline justify-between gap-4">
            <span className="label">Fig. 00 — {profile.name}, on the floor</span>
            <span className="label">Boston, MA</span>
          </figcaption>
        </motion.figure>
      </div>
    </section>
  )
}
