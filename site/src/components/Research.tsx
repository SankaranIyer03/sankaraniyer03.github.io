import { motion } from 'motion/react'
import { otherResearch, publications } from '../content/publications'
import { riseIn, staggerParent, viewportOnce } from '../lib/motion'
import { CountUp } from './primitives/CountUp'
import { SectionHead } from './primitives/SectionHead'

export function Research() {
  return (
    <section id="research" className="border-b border-line bg-paper-deep/40">
      <div className="mx-auto max-w-[1600px] px-6 py-24 md:px-10 md:py-32">
        <SectionHead
          index="04"
          kicker="Research & publications"
          title="Where the modelling gets rigorous."
          lede="Two papers: one published on interpretable hybrid machine learning for reaction kinetics, one in review on manufacturing standardization and throughput."
        />

        <motion.div
          className="mt-16 space-y-6"
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

                  {pub.results && (
                    <dl className="mt-7 space-y-4">
                      {pub.results.map((result) => (
                        <div key={result.label} className="border-t border-line pt-3">
                          <dt className="font-mono text-[1.1rem] font-medium text-ink">
                            <CountUp value={result.value} />
                          </dt>
                          <dd className="mt-1 text-[12.5px] text-ink-muted">{result.label}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

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

        {/* Other research */}
        <div className="mt-16 border-t border-line pt-10">
          <p className="label">Also investigated</p>
          <div className="mt-6 grid grid-cols-1 gap-x-14 gap-y-6 md:grid-cols-2">
            {otherResearch.map((item) => (
              <motion.div
                key={item.title}
                variants={riseIn}
                initial="hidden"
                whileInView="show"
                viewport={viewportOnce}
                className="border-t border-line pt-4"
              >
                <h4 className="text-[15px] font-medium tracking-tight">{item.title}</h4>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">{item.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
