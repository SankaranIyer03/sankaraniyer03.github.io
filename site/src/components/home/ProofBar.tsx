import { motion } from 'motion/react'
import { profile } from '../../content/profile'
import { CountUp } from '../primitives/CountUp'
import { riseIn, staggerParent, viewportOnce } from '../../lib/motion'

/**
 * Four numbers directly under the hero. If a recruiter reads one thing after
 * the headline, it should be evidence of scale — not another adjective.
 */
export function ProofBar() {
  return (
    <section aria-label="Career highlights" className="border-b border-line bg-card">
      {/* Dividers are borders rather than a grey backing plate, so the band
          never flashes solid grey while the figures are still animating in. */}
      <motion.dl
        className="mx-auto grid max-w-[1600px] grid-cols-2 px-6 md:px-10 lg:grid-cols-4"
        variants={staggerParent}
        initial="hidden"
        whileInView="show"
        viewport={viewportOnce}
      >
        {profile.proof.map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={riseIn}
            className={`py-7 ${i % 2 === 1 ? 'border-l border-line pl-6' : ''} ${
              i >= 2 ? 'border-t border-line' : ''
            } lg:border-t-0 lg:pl-6 ${i > 0 ? 'lg:border-l lg:border-line' : 'lg:pl-0'}`}
          >
            <dt className="text-[clamp(1.8rem,3.4vw,2.9rem)] leading-none font-medium tracking-[-0.03em] tnum">
              <CountUp value={stat.value} />
            </dt>
            <dd className="mt-3 text-[13.5px] leading-snug text-ink-soft">{stat.label}</dd>
            <dd className="label mt-1.5">{stat.context}</dd>
          </motion.div>
        ))}
      </motion.dl>
    </section>
  )
}
