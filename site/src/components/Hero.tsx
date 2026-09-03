import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { profile } from '../content/profile'
import { acts } from '../content/acts'
import { Carousel } from './home/Carousel'
import { Credentials } from './home/Credentials'
import { getMedia } from '../lib/media'
import { easePrecise, riseIn, staggerParent, usePrefersReducedMotion } from '../lib/motion'
import { scrollTo } from '../lib/useSmoothScroll'

function SchoolMark({ media, alt }: { media: string; alt: string }) {
  const entry = getMedia(media)
  if (!entry) return null

  return (
    <img
      src={entry.mid}
      srcSet={`${entry.small} 160w, ${entry.mid} 320w`}
      sizes="96px"
      alt={alt}
      loading="eager"
      decoding="async"
      className="h-7 w-auto max-w-[96px] object-contain object-left"
    />
  )
}

/**
 * The four beats, set as a rail rather than as the headline. On their own they
 * read as four separate skills, which was the problem, the headline claims the
 * system, and the rail shows the loop the system runs.
 */
function LoopRail() {
  return (
    <motion.ol
      className="mt-5 flex flex-wrap items-center gap-x-1 gap-y-2"
      variants={staggerParent}
      initial="hidden"
      animate="show"
    >
      {acts.map((act, i) => (
        <motion.li key={act.id} variants={riseIn} className="flex items-center gap-1">
          <span className="flex items-baseline gap-1.5 border border-line bg-card px-2.5 py-1.5">
            <span className="label tnum text-ink-faint">{act.code}</span>
            <span className="font-mono text-[11px] tracking-[0.1em] uppercase text-ink-soft">
              {act.verb}
            </span>
          </span>
          <span className="font-mono text-[11px] text-signal" aria-hidden="true">
            {i === acts.length - 1 ? '↻' : '→'}
          </span>
        </motion.li>
      ))}
      <motion.li variants={riseIn} className="ml-1.5">
        <span className="label text-ink-faint">one loop</span>
      </motion.li>
    </motion.ol>
  )
}

/**
 * The whole first screen, sized to the viewport so the credential wall lands
 * above the fold, the identity, the claim, the photographs and the six places
 * that back it up, with no scrolling required. Everything that needs more than
 * a glance lives on its own page.
 */
export function Hero() {
  const reduced = usePrefersReducedMotion()

  return (
    <section
      id="top"
      className="relative flex min-h-svh flex-col overflow-hidden border-b border-line"
    >
      <div className="bp-grid bp-mask pointer-events-none absolute inset-0 opacity-60" />

      <div className="relative mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-6 pt-[4.5rem] pb-7 md:px-10 md:pt-20">
        <div className="grid flex-1 grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-14">
          {/* ---------------- Identity ---------------- */}
          <motion.div
            className="min-w-0"
            variants={staggerParent}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={riseIn} className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="label">{profile.name}</span>
              <span className="h-px w-8 bg-line-strong" />
              <span className="label label-signal">{profile.role}</span>
            </motion.div>

            <h1 className="mt-5 text-[clamp(2rem,4.2vw,3.1rem)] leading-[1.02] font-medium tracking-[-0.035em]">
              {[...profile.headline.lines, profile.headline.accent].map((line, i) => (
                <motion.span
                  key={line}
                  className="block"
                  initial={reduced ? { opacity: 1 } : { opacity: 0, y: 22, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.8, delay: 0.1 + i * 0.11, ease: easePrecise }}
                >
                  {i === profile.headline.lines.length ? (
                    <span className="text-signal">{line}</span>
                  ) : (
                    line
                  )}
                </motion.span>
              ))}
            </h1>

            {/* The sentence that decides whether the rest gets read */}
            <motion.p
              variants={riseIn}
              className="mt-5 max-w-2xl border-l border-signal pl-5 text-[16px] leading-relaxed text-ink-soft md:text-[17.5px]"
            >
              {profile.standfirst}
            </motion.p>

            <LoopRail />

            <motion.ul
              variants={riseIn}
              className="mt-6 grid max-w-xl grid-cols-2 gap-x-6 gap-y-3"
            >
              {profile.education.map((ed) => (
                <li key={ed.abbr} className="min-w-0">
                  <SchoolMark media={ed.logo} alt={ed.school} />
                  <p className="mt-2 text-[13px] leading-snug text-ink-soft">{ed.degree}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-muted">{ed.focus}</p>
                </li>
              ))}
            </motion.ul>

            {/* Above the buttons, so the six places that back the claim are
                read before the invitation to go further. */}
            <motion.div variants={riseIn} className="mt-6">
              <Credentials />
            </motion.div>

            <motion.div variants={riseIn} className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                to="/projects"
                className="group inline-flex items-center gap-3 border border-ink bg-ink px-6 py-3 text-sm font-medium text-paper transition-colors hover:border-signal hover:bg-signal"
              >
                See the projects
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <button
                type="button"
                onClick={() => scrollTo('#how')}
                className="inline-flex items-center gap-3 border border-line-strong px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-ink hover:bg-card"
              >
                How I work
              </button>
            </motion.div>
          </motion.div>

          {/* ---------------- Carousel ---------------- */}
          <motion.div
            className="mx-auto w-full max-w-[440px]"
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: easePrecise, delay: 0.28 }}
          >
            <Carousel />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
