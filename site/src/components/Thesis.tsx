import { motion } from 'motion/react'
import { profile } from '../content/profile'
import { acts } from '../content/acts'
import { riseIn, ruleIn, staggerParent, viewportOnce } from '../lib/motion'
import { SectionHead } from './primitives/SectionHead'

export function Thesis() {
  return (
    <section id="thesis" className="border-b border-line">
      <div className="mx-auto max-w-[1600px] px-6 py-24 md:px-10 md:py-32">
        <SectionHead
          index="00"
          kicker={profile.thesis.kicker}
          title={profile.thesis.heading}
        />

        <motion.div
          className="mt-14 grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-12"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <div className="lg:col-span-7 lg:col-start-4">
            {profile.thesis.body.map((para, i) => (
              <motion.p
                key={i}
                variants={riseIn}
                className={
                  i === 0
                    ? 'text-xl leading-relaxed text-ink md:text-[1.4rem] md:leading-[1.6]'
                    : 'mt-6 text-[15px] leading-relaxed text-ink-soft md:text-base'
                }
              >
                {para}
              </motion.p>
            ))}
          </div>
        </motion.div>

        {/* The four acts, as a process strip */}
        <motion.div
          className="mt-24"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <motion.div variants={ruleIn} className="h-px origin-left bg-line-strong" />

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
            {acts.map((act) => (
              <motion.article
                key={act.id}
                variants={riseIn}
                className="group relative border-b border-line px-0 py-8 md:px-6 md:first:pl-0 xl:border-r xl:border-b-0 xl:last:border-r-0"
              >
                {/* Node marker on the process line */}
                <span className="absolute -top-[5px] left-0 h-[9px] w-[9px] border border-ink bg-paper transition-colors duration-300 group-hover:border-signal group-hover:bg-signal md:left-6" />

                <div className="flex items-baseline gap-3">
                  <span className="label label-signal tnum">{act.code}</span>
                  <h3 className="text-[1.35rem] font-medium tracking-tight">{act.verb}</h3>
                </div>

                <p className="mt-1 font-mono text-[11px] tracking-[0.1em] text-ink-faint uppercase">
                  {act.title}
                </p>

                <p className="mt-5 text-[15px] leading-snug text-ink italic">
                  “{act.question}”
                </p>

                <p className="mt-4 text-[13.5px] leading-relaxed text-ink-muted">{act.body}</p>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
