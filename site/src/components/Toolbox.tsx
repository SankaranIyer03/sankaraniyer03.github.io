import { motion } from 'motion/react'
import { profile } from '../content/profile'
import { actById, type ActId } from '../content/acts'
import { riseIn, staggerParent, viewportOnce } from '../lib/motion'
import { SectionHead } from './primitives/SectionHead'

/**
 * Grouped by stage rather than by language, and with no proficiency bars —
 * "MATLAB 90%" tells a reader nothing and reads junior.
 */
export function Toolbox() {
  return (
    <section id="toolbox" className="border-b border-line">
      <div className="mx-auto max-w-[1600px] px-6 py-24 md:px-10 md:py-32">
        <SectionHead
          index="05"
          kicker="Toolbox"
          title="Capabilities, grouped by where they sit in the loop."
          lede="Listed by what they let me do rather than by percentage proficiency — every one of these has been used on something in the portfolio above."
        />

        <motion.div
          className="mt-16 grid grid-cols-1 border-t border-line-strong md:grid-cols-2 xl:grid-cols-4"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          {profile.toolbox.map((group) => {
            const act = actById[group.act as ActId]
            return (
              <motion.div
                key={group.act}
                variants={riseIn}
                className="group border-b border-line px-0 py-8 md:px-7 md:first:pl-0 xl:border-r xl:last:border-r-0"
              >
                <div className="flex items-baseline gap-3">
                  <span className="label label-signal tnum">{act.code}</span>
                  <h3 className="text-[1.2rem] font-medium tracking-tight">{act.verb}</h3>
                </div>
                <p className="mt-2 font-mono text-[10.5px] tracking-[0.1em] text-ink-faint uppercase">
                  {group.label}
                </p>

                <ul className="mt-6">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-baseline gap-2.5 border-t border-line py-2.5"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 bg-line-strong transition-colors duration-300 group-hover:bg-signal" />
                      <span className="text-[13.5px] leading-snug text-ink-soft">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
