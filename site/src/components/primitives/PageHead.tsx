import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { riseIn, staggerParent } from '../../lib/motion'

interface PageHeadProps {
  /** Two-digit page index, matching the nav order. */
  index: string
  kicker: string
  title: ReactNode
  lede?: string
  /** Right-hand metadata, e.g. a count or a date range. */
  meta?: string
  children?: ReactNode
}

/**
 * Masthead for the standalone pages. Carries the fixed-nav top padding so
 * every page clears it the same way, and mirrors the drawing-title-block
 * layout used by the home sections.
 */
export function PageHead({ index, kicker, title, lede, meta, children }: PageHeadProps) {
  return (
    <header className="relative overflow-hidden border-b border-line">
      <div className="bp-grid bp-mask pointer-events-none absolute inset-0 opacity-50" />

      <motion.div
        className="relative mx-auto max-w-[1600px] px-6 pt-28 pb-14 md:px-10 md:pt-36 md:pb-16"
        variants={staggerParent}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={riseIn} className="flex items-center gap-4">
          <span className="label tnum">{index}</span>
          <span className="h-px w-16 bg-line-strong" />
          <span className="label label-signal">{kicker}</span>
          {meta && (
            <>
              <span className="h-px flex-1 bg-line" />
              <span className="label hidden sm:inline">{meta}</span>
            </>
          )}
        </motion.div>

        <motion.h1
          variants={riseIn}
          className="mt-6 max-w-4xl text-[clamp(2.1rem,4.8vw,3.8rem)] leading-[1.03] font-medium tracking-[-0.035em]"
        >
          {title}
        </motion.h1>

        {lede && (
          <motion.p
            variants={riseIn}
            className="mt-7 max-w-2xl text-[16.5px] leading-relaxed text-ink-soft"
          >
            {lede}
          </motion.p>
        )}

        {children && <motion.div variants={riseIn}>{children}</motion.div>}
      </motion.div>
    </header>
  )
}
