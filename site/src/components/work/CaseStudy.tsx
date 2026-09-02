import { motion } from 'motion/react'
import type { Project } from '../../content/projects'
import { actById } from '../../content/acts'
import { riseIn, ruleIn, staggerParent, viewportOnce } from '../../lib/motion'
import { galleryKeys } from '../../lib/media'
import { MetricRow } from '../primitives/Metric'
import { Gallery } from '../primitives/Gallery'
import { InteractiveSlot } from '../interactive/InteractiveSlot'
import { ActSpans } from './ActSpans'
import { StackChips } from './StackChips'

/**
 * Full-depth treatment for the flagship projects: the four-act chapter walk is
 * what turns a project into a demonstration of the thesis.
 */
export function CaseStudy({ project }: { project: Project }) {
  const gallery = project.gallery ? galleryKeys(project.gallery.prefix, project.gallery.count) : []

  return (
    <motion.article
      id={project.id}
      className="scroll-mt-24 border-t border-ink pt-10"
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
    >
      {/* ---- Masthead ---- */}
      <motion.div variants={riseIn} className="flex flex-wrap items-center justify-between gap-4">
        <ActSpans spans={project.spans} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] tracking-[0.08em] text-ink-muted uppercase">
          <span>{project.org}</span>
          <span className="text-line-strong">·</span>
          <span>{project.period}</span>
          <span className="text-line-strong">·</span>
          <span className="text-signal">{project.role}</span>
        </div>
      </motion.div>

      <div className="mt-7 grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <motion.h3
            variants={riseIn}
            className="text-[clamp(1.7rem,3.6vw,2.9rem)] leading-[1.08] font-medium tracking-[-0.03em]"
          >
            {project.title}
          </motion.h3>
          <motion.p variants={riseIn} className="mt-3 text-lg text-ink-muted">
            {project.subtitle}
          </motion.p>
          <motion.p
            variants={riseIn}
            className="mt-8 border-l border-signal pl-5 text-[17px] leading-relaxed text-ink md:text-lg"
          >
            {project.hook}
          </motion.p>
        </div>

        <motion.div variants={riseIn} className="lg:col-span-5">
          <p className="text-[15px] leading-relaxed text-ink-soft">{project.summary}</p>
        </motion.div>
      </div>

      {project.metrics && (
        <motion.div variants={riseIn} className="mt-14">
          <MetricRow metrics={[...project.metrics]} />
        </motion.div>
      )}

      {/* ---- Ownership ---- */}
      <motion.div variants={riseIn} className="mt-16 grid grid-cols-1 gap-x-16 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <h4 className="label">What I owned</h4>
        </div>
        <ol className="lg:col-span-9">
          {project.owned.map((item, i) => (
            <li key={i} className="flex gap-5 border-t border-line py-4 first:border-t-0 first:pt-0">
              <span className="mt-1 font-mono text-[11px] text-ink-faint tnum">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="text-[15px] leading-relaxed text-ink-soft">{item}</p>
            </li>
          ))}
        </ol>
      </motion.div>

      {/* ---- The four-act walk ---- */}
      {project.chapters && (
        <div className="mt-20">
          <motion.div variants={ruleIn} className="h-px origin-left bg-line-strong" />
          <p className="label mt-4">Walking the loop</p>

          <div className="mt-2">
            {project.chapters.map((chapter) => {
              const act = actById[chapter.act]
              return (
                <section key={chapter.code} className="border-b border-line py-14 last:border-b-0">
                  <div className="grid grid-cols-1 gap-x-16 gap-y-6 lg:grid-cols-12">
                    <div className="lg:col-span-4">
                      <div className="flex items-baseline gap-3">
                        <span className="label label-signal tnum">{chapter.code}</span>
                        <span className="label">{act.verb}</span>
                      </div>
                      <h5 className="mt-3 text-[1.4rem] leading-tight font-medium tracking-tight">
                        {chapter.title}
                      </h5>
                    </div>
                    <p className="text-[15px] leading-relaxed text-ink-soft lg:col-span-8">
                      {chapter.body}
                    </p>
                  </div>

                  {chapter.interactive && (
                    <div className="mt-10">
                      <InteractiveSlot
                        id={chapter.interactive}
                        modelLabel={`${project.title} — ${chapter.title}`}
                        modelCaption="Orbitable 3D view of the designed assembly."
                      />
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      )}

      {/* ---- Standalone interactive (projects without a chapter walk) ---- */}
      {!project.chapters && project.interactive && (
        <motion.div variants={riseIn} className="mt-14">
          <InteractiveSlot
            id={project.interactive}
            modelLabel={project.title}
            modelCaption="Orbitable 3D view of the designed assembly."
          />
        </motion.div>
      )}

      {gallery.length > 0 && (
        <motion.div variants={riseIn} className="mt-16">
          <div className="flex items-baseline justify-between">
            <p className="label">Build & test record</p>
            <p className="label tnum">{String(gallery.length).padStart(2, '0')} frames</p>
          </div>
          <div className="mt-4">
            <Gallery keys={gallery} label={project.title} />
          </div>
        </motion.div>
      )}

      <motion.div variants={riseIn} className="mt-14">
        <StackChips stack={project.stack} />
      </motion.div>
    </motion.article>
  )
}
