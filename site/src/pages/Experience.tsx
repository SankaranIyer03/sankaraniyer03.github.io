import { useEffect } from 'react'
import { motion } from 'motion/react'
import { companyLogos, leadership, roles } from '../content/experience'
import { getMedia } from '../lib/media'
import { PageHead } from '../components/primitives/PageHead'
import { VerticalTimeline } from '../components/experience/VerticalTimeline'
import { Footer } from '../components/Footer'
import { riseIn, staggerParent, viewportOnce } from '../lib/motion'

export default function Experience() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <>
      <PageHead
        index="05"
        kicker="Experience"
        title={
          <>
            Manufacturing & Operations experience across{' '}
            <span className="text-signal">GE, Rockwell, and Deloitte.</span>
          </>
        }
        lede="Manufacturing at GE Vernova, four terms at GE Aerospace, automation consulting at Rockwell, enterprise systems at Deloitte."
        meta={`${roles.length} roles · 2021, 2026`}
      />

      <section className="border-b border-line py-16 md:py-20">
        <div className="mx-auto max-w-[1600px] px-6 md:px-10">
          <ul className="mb-8 flex flex-wrap items-center gap-x-6 gap-y-4 md:gap-x-8">
            {companyLogos.map((item) => {
              const logo = getMedia(item.logo)
              if (!logo) return null
              return (
                <li key={item.name} className="flex items-center">
                  <img
                    src={logo.mid ?? logo.small}
                    alt={item.name}
                    loading="lazy"
                    className="h-16 w-auto max-w-[8.5rem] object-contain md:h-[4.5rem]"
                  />
                </li>
              )
            })}
          </ul>
          <VerticalTimeline />
        </div>
      </section>

      {/* ---------------- Leadership & research ---------------- */}
      <section className="border-b border-line py-20 md:py-24">
        <div className="mx-auto max-w-[1600px] px-6 md:px-10">
          <div className="flex items-center gap-4">
            <span className="label label-signal">Programs led</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <motion.div
            className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2"
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={viewportOnce}
          >
            {leadership.map((item) => {
              const logo = item.logo ? getMedia(item.logo) : undefined
              return (
                <motion.article
                  key={item.id}
                  variants={riseIn}
                  className="reg-marks relative border border-line bg-card p-6 md:p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-[1.2rem] leading-tight font-medium tracking-tight">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 text-sm text-ink-muted">{item.org}</p>
                    </div>
                    {logo && (
                      <img
                        src={logo.mid ?? logo.small}
                        alt={item.org}
                        loading="lazy"
                        className="h-8 max-w-[80px] shrink-0 object-contain opacity-70"
                      />
                    )}
                  </div>
                  <p className="label mt-4">{item.period}</p>
                  <ul className="mt-5">
                    {item.bullets.map((bullet, i) => (
                      <li key={i} className="border-t border-line py-3">
                        <p className="text-[13.5px] leading-relaxed text-ink-soft">{bullet}</p>
                      </li>
                    ))}
                  </ul>
                </motion.article>
              )
            })}
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  )
}
