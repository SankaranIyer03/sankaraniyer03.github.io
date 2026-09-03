import { motion } from 'motion/react'
import { riseIn, ruleIn, staggerParent, viewportOnce } from '../../lib/motion'

interface SectionHeadProps {
  index: string
  kicker: string
  title: string
  lede?: string
  align?: 'left' | 'wide'
}

/** Section header in the drafting-sheet idiom: index, rule, kicker, title. */
export function SectionHead({ index, kicker, title, lede }: SectionHeadProps) {
  return (
    <motion.header
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
    >
      <motion.div variants={riseIn} className="flex items-center gap-4">
        <span className="label tnum">{index}</span>
        <motion.span variants={ruleIn} className="h-px w-16 origin-left bg-line-strong" />
        <span className="label label-signal">{kicker}</span>
      </motion.div>

      <motion.h2
        variants={riseIn}
        className="mt-6 max-w-4xl text-[clamp(1.9rem,4.2vw,3.4rem)] leading-[1.06] font-medium tracking-[-0.03em]"
      >
        {title}
      </motion.h2>

      {lede && (
        <motion.p
          variants={riseIn}
          className="mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-muted"
        >
          {lede}
        </motion.p>
      )}
    </motion.header>
  )
}
