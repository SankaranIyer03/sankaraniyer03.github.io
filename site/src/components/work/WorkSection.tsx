import { motion } from 'motion/react'
import { acts } from '../../content/acts'
import { projects } from '../../content/projects'
import { staggerParent, viewportOnce } from '../../lib/motion'
import { SectionHead } from '../primitives/SectionHead'
import { CaseStudy } from './CaseStudy'
import { ProjectCard } from './ProjectCard'

/** The two projects that run all four acts get the full case-study treatment. */
const FLAGSHIPS = ['ge-vernova', 'rc-car']

export function WorkSection() {
  const flagships = FLAGSHIPS.map((id) => projects.find((p) => p.id === id)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  )
  const rest = projects.filter((p) => !FLAGSHIPS.includes(p.id))

  return (
    <>
      {/* ---------- End-to-end case studies ---------- */}
      <section id="work" className="border-b border-line">
        <div className="mx-auto max-w-[1600px] px-6 py-24 md:px-10 md:py-32">
          <SectionHead
            index="01"
            kicker="End-to-end case studies"
            title="Two projects that run the whole loop."
            lede="Each of these starts at a design decision and finishes with data that changes the design decision. They are the argument for the thesis, so they get walked through act by act."
          />

          <div className="mt-20 space-y-28">
            {flagships.map((project) => (
              <CaseStudy key={project.id} project={project} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- By stage ---------- */}
      <section id="stages" className="border-b border-line bg-paper-deep/40">
        <div className="mx-auto max-w-[1600px] px-6 py-24 md:px-10 md:py-32">
          <SectionHead
            index="02"
            kicker="Work by stage"
            title="The rest of the portfolio, filed where it lives."
            lede="Design, industrialization, automation, operations intelligence. The markers on each card show which stages that project actually touched."
          />

          <div className="mt-20 space-y-24">
            {acts.map((act) => {
              const actProjects = rest.filter((p) => p.act === act.id)
              if (!actProjects.length) return null

              return (
                <div key={act.id} className="grid grid-cols-1 gap-x-14 gap-y-10 lg:grid-cols-12">
                  {/* Chapter header pins while its projects scroll past */}
                  <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
                    <div className="flex items-baseline gap-3">
                      <span className="label label-signal tnum">{act.code}</span>
                      <h3 className="text-[2rem] leading-none font-medium tracking-[-0.03em]">
                        {act.verb}
                      </h3>
                    </div>
                    <p className="mt-3 font-mono text-[11px] tracking-[0.1em] text-ink-faint uppercase">
                      {act.title}
                    </p>
                    <p className="mt-6 text-[15px] leading-snug text-ink italic">
                      “{act.question}”
                    </p>
                    <p className="mt-4 max-w-sm text-[13.5px] leading-relaxed text-ink-muted">
                      {act.body}
                    </p>
                    <p className="label mt-6 tnum">
                      {String(actProjects.length).padStart(2, '0')}{' '}
                      {actProjects.length === 1 ? 'project' : 'projects'}
                    </p>
                  </div>

                  <motion.div
                    className="grid grid-cols-1 gap-6 lg:col-span-8 xl:grid-cols-2"
                    variants={staggerParent}
                    initial="hidden"
                    whileInView="show"
                    viewport={viewportOnce}
                  >
                    {actProjects.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </motion.div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </>
  )
}
