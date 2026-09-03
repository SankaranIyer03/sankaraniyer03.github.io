import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { featuredProjects, type Project } from '../../content/projects'
import { actById } from '../../content/acts'
import { Figure } from '../primitives/Figure'
import { Video } from '../primitives/Video'
import { CountUp } from '../primitives/CountUp'
import { SectionHead } from '../primitives/SectionHead'
import { ActSpans } from '../work/ActSpans'
import { riseIn, staggerParent, viewportOnce } from '../../lib/motion'

/** Card media is the hook, a real photograph or a real clip, never a mock-up. */
function CardMedia({ project, priority }: { project: Project; priority: boolean }) {
  const { cardMedia } = project
  if (cardMedia.kind === 'video') {
    return (
      <Video
        media={cardMedia.key}
        mode="loop"
        label={`${project.title}, ${cardMedia.caption}`}
        className="border-0"
        priority={priority}
      />
    )
  }
  return (
    <Figure
      media={cardMedia.key}
      alt={`${project.title}, ${cardMedia.caption}`}
      size="large"
      priority={priority}
      className="aspect-4/3 w-full"
      sizes="(max-width: 1024px) 100vw, 52vw"
    />
  )
}

function FeaturedCard({ project, index }: { project: Project; index: number }) {
  /* Alternate the media side so three large cards don't read as a list. */
  const flipped = index % 2 === 1

  return (
    <motion.article
      variants={riseIn}
      className="group grid grid-cols-1 items-center gap-8 border-t border-line pt-10 lg:grid-cols-12 lg:gap-14 lg:pt-14"
    >
      <div
        className={`reg-marks relative lg:col-span-6 ${flipped ? 'lg:order-2' : ''}`}
      >
        <Link
          to={`/work/${project.slug}`}
          tabIndex={-1}
          aria-hidden="true"
          className="block overflow-hidden border border-line"
        >
          <div className="transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.02]">
            <CardMedia project={project} priority={index === 0} />
          </div>
        </Link>
      </div>

      <div className={`lg:col-span-6 ${flipped ? 'lg:order-1' : ''}`}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="label label-signal">{actById[project.act].verb}</span>
          <ActSpans spans={project.spans} />
          <span className="label">{project.period}</span>
        </div>

        <h3 className="mt-5 text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.08] font-medium tracking-[-0.03em]">
          <Link
            to={`/work/${project.slug}`}
            className="decoration-line-strong underline-offset-[6px] transition-colors hover:text-signal hover:underline"
          >
            {project.title}
          </Link>
        </h3>

        <p className="mt-2 text-[14px] text-ink-muted">
          {project.org} · {project.role}
        </p>

        <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-soft">
          {project.oneLiner}
        </p>

        {project.headlineMetrics.length > 0 && (
          <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-5">
            {project.headlineMetrics.map((metric) => (
              <div key={metric.label}>
                <dt className="text-[1.65rem] leading-none font-medium tracking-[-0.02em] tnum">
                  <CountUp value={metric.value} />
                  {metric.unit && (
                    <span className="ml-1 font-mono text-[0.5em] tracking-wide text-ink-muted">
                      {metric.unit}
                    </span>
                  )}
                </dt>
                <dd className="mt-2 max-w-[9rem] text-[12.5px] leading-snug text-ink-muted">
                  {metric.label}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-7 flex flex-wrap items-center gap-2">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="border border-line px-2.5 py-1 font-mono text-[10.5px] tracking-[0.1em] text-ink-muted uppercase"
            >
              {tag}
            </span>
          ))}
        </div>

        <Link
          to={`/work/${project.slug}`}
          className="mt-8 inline-flex items-center gap-3 border-b border-ink pb-1.5 text-sm font-medium transition-colors hover:border-signal hover:text-signal"
        >
          Open case study
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </motion.article>
  )
}

interface FeaturedWorkProps {
  /** Omit on a page that already has a masthead index; a rule header is used instead. */
  index?: string
  kicker?: string
  title?: string
  lede?: string
}

export function FeaturedWork({
  index,
  kicker = 'In depth',
  title = 'Three projects that close the loop.',
  lede,
}: FeaturedWorkProps) {
  return (
    <section id="work" className="border-b border-line py-20 md:py-28">
      <div className="mx-auto max-w-[1600px] px-6 md:px-10">
        {index ? (
          <SectionHead index={index} kicker={kicker} title={title} lede={lede} />
        ) : (
          <div className="flex items-center gap-4">
            <span className="label label-signal">{kicker}</span>
            <span className="h-px flex-1 bg-line" />
            <span className="label hidden sm:inline">{title}</span>
          </div>
        )}

        <motion.div
          className="mt-14 flex flex-col gap-16 lg:gap-24"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          {featuredProjects.map((project, i) => (
            <FeaturedCard key={project.id} project={project} index={i} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
