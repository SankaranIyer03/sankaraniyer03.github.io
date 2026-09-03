import { motion } from 'motion/react'
import { publications } from '../content/publications'
import { riseIn, staggerParent, viewportOnce } from '../lib/motion'
import { SectionHead } from './primitives/SectionHead'

interface ResearchProps {
  index?: string
  /** On its own page the masthead supplies the heading, so skip it here. */
  variant?: 'section' | 'page'
}

export function Research({ index = '05', variant = 'section' }: ResearchProps) {
  return (
    <section
      id="research"
      className={`border-b border-line bg-paper-deep/40 ${
        variant === 'page' ? 'py-16 md:py-20' : ''
      }`}
    >
      <div
        className={`mx-auto max-w-[1600px] px-6 md:px-10 ${
          variant === 'page' ? '' : 'py-24 md:py-32'
        }`}
      >
        {variant === 'section' && (
          <SectionHead
            index={index}
            kicker="Research & publications"
            title="Industry & academic research."
            lede="A published paper on hybrid reaction kinetics and a manufacturing paper in review."
          />
        )}

        <motion.div
          className={`space-y-6 ${variant === 'page' ? '' : 'mt-16'}`}
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          {publications.map((pub) => (
            <motion.article
              key={pub.id}
              variants={riseIn}
              className="reg-marks relative border border-line bg-card"
            >
              <div className="grid grid-cols-1 gap-x-14 lg:grid-cols-12">
                <div className="border-line p-6 md:p-8 lg:col-span-7 lg:border-r">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`border px-2 py-1 font-mono text-[10px] tracking-[0.12em] uppercase ${
                        pub.status === 'published'
                          ? 'border-ink bg-ink text-paper'
                          : 'border-signal text-signal'
                      }`}
                    >
                      {pub.status === 'published' ? 'Published' : 'In review'}
                    </span>
                    <span className="label tnum">{pub.year}</span>
                    <span className="label">{pub.authorship}</span>
                  </div>

                  <h3 className="mt-5 text-[1.35rem] leading-[1.2] font-medium tracking-[-0.02em] md:text-[1.55rem]">
                    {pub.title}
                  </h3>
                  <p className="mt-3 text-sm text-ink-muted">{pub.venue}</p>

                  {pub.href && (
                    <a
                      href={pub.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group mt-6 inline-flex items-center gap-2 border-b border-ink pb-0.5 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors hover:border-signal hover:text-signal"
                    >
                      Read the paper
                      <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                        ↗
                      </span>
                    </a>
                  )}
                  {pub.doi && (
                    <p className="mt-3 font-mono text-[10.5px] text-ink-faint">DOI {pub.doi}</p>
                  )}
                </div>

                <div className="p-6 md:p-8 lg:col-span-5">
                  <p className="text-[14px] leading-relaxed text-ink-soft">{pub.abstract}</p>

                  <ul className="mt-7 flex flex-wrap gap-1.5">
                    {pub.tags.map((tag) => (
                      <li
                        key={tag}
                        className="border border-line px-2 py-1 font-mono text-[10.5px] text-ink-muted"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
