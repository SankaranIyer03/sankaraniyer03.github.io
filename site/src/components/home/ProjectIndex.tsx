import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { otherProjects, type Project } from '../../content/projects'
import { actById } from '../../content/acts'
import { Figure } from '../primitives/Figure'
import { getVideo } from '../../lib/video'
import { SectionHead } from '../primitives/SectionHead'
import { riseIn, staggerParent, viewportOnce } from '../../lib/motion'

/**
 * A thumbnail for the index grid. Video-backed projects show their poster
 * frame rather than a player — six autoplaying clips in one viewport is a
 * decision no visitor asked for.
 */
function Thumb({ project }: { project: Project }) {
  const { cardMedia } = project

  if (cardMedia.kind === 'video') {
    const entry = getVideo(cardMedia.key)
    if (!entry) return <div className="aspect-16/10 w-full bg-paper-deep" />
    return (
      <div className="relative aspect-16/10 w-full overflow-hidden bg-paper-deep">
        <img
          src={entry.poster.mid}
          alt={`${project.title} — ${cardMedia.caption}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <Figure
      media={cardMedia.key}
      alt={`${project.title} — ${cardMedia.caption}`}
      className="aspect-16/10 w-full"
      sizes="(max-width: 768px) 100vw, 33vw"
    />
  )
}

function IndexCard({ project }: { project: Project }) {
  return (
    <motion.article variants={riseIn} className="group">
      <Link
        to={`/work/${project.slug}`}
        className="flex h-full flex-col border border-line bg-card transition-colors duration-300 hover:border-line-strong"
      >
        <div className="overflow-hidden border-b border-line">
          <div className="transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]">
            <Thumb project={project} />
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="label label-signal">{actById[project.act].verb}</span>
            <span className="label">{project.period}</span>
          </div>

          <h3 className="mt-3.5 text-[1.15rem] leading-snug font-medium tracking-[-0.02em] transition-colors group-hover:text-signal">
            {project.title}
          </h3>

          <p className="mt-1.5 text-[12.5px] text-ink-muted">{project.org}</p>

          <p className="mt-3.5 text-[14px] leading-relaxed text-ink-soft">{project.subtitle}</p>

          <div className="mt-auto flex items-center justify-between gap-3 pt-6">
            <div className="flex flex-wrap gap-1.5">
              {project.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="border border-line px-2 py-0.5 font-mono text-[10px] tracking-[0.1em] text-ink-muted uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
            <span
              aria-hidden="true"
              className="text-ink-faint transition-all duration-300 group-hover:translate-x-1 group-hover:text-signal"
            >
              →
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}

export function ProjectIndex() {
  return (
    <section id="more-work" className="border-b border-line bg-paper-deep py-20 md:py-24">
      <div className="mx-auto max-w-[1600px] px-6 md:px-10">
        <SectionHead
          index="03"
          kicker="Also"
          title="Six more, briefly."
          lede="Hardware, forecasting, process modelling and one funded venture. Same rule: open the ones that matter to you."
        />

        <motion.div
          className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          {otherProjects.map((project) => (
            <IndexCard key={project.id} project={project} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
