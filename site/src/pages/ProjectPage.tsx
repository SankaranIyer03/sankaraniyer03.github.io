import { useEffect } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { projects, projectBySlug, type MediaItem, type ModelItem } from '../content/projects'
import { actById } from '../content/acts'
import { Figure } from '../components/primitives/Figure'
import { Video } from '../components/primitives/Video'
import { CountUp } from '../components/primitives/CountUp'
import { ModelViewer } from '../components/primitives/ModelViewer'
import { InteractiveSlot } from '../components/interactive/InteractiveSlot'
import { ActSpans } from '../components/work/ActSpans'
import { riseIn, staggerParent, viewportOnce } from '../lib/motion'

/** One media item, rendered as the right kind of element for its type. */
function Media({ item, priority = false }: { item: MediaItem; priority?: boolean }) {
  if (item.kind === 'video') {
    return (
      <Video
        media={item.key}
        mode={item.loop ? 'loop' : 'player'}
        label={item.caption}
        caption={item.caption}
        priority={priority}
      />
    )
  }
  return (
    <figure className="reg-marks relative border border-line bg-card">
      <Figure
        media={item.key}
        alt={item.caption}
        size="large"
        priority={priority}
        sizes={item.wide ? '100vw' : '(max-width: 768px) 100vw, 50vw'}
      />
      <figcaption className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-muted">
        {item.caption}
      </figcaption>
    </figure>
  )
}

function Model({ item }: { item: ModelItem }) {
  return <ModelViewer src={item.src} label={item.label} caption={item.caption} />
}

const DOC_KIND: Record<string, string> = {
  paper: 'Paper',
  deck: 'Deck',
  schematic: 'Schematic',
  code: 'Code',
}

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>()
  const project = slug ? projectBySlug(slug) : undefined

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [slug])

  useEffect(() => {
    if (!project) return
    document.title = `${project.title} — Sankaran Iyer`
    return () => {
      document.title = 'Sankaran Iyer — Manufacturing Systems & Operations Engineer'
    }
  }, [project])

  if (!project) return <Navigate to="/" replace />

  const index = projects.findIndex((p) => p.id === project.id)
  const next = projects[(index + 1) % projects.length]
  /* A project can nominate a wide item as its opener; otherwise the card image
     leads, which keeps the page consistent with the card it was clicked from. */
  const hero = project.media?.find((m) => m.wide) ?? project.cardMedia
  /* Anything already shown as the hero or inside a chapter is not repeated. */
  const spokenFor = new Set<string>([
    hero.key,
    ...(project.chapters ?? []).flatMap((c) => (c.media ? [c.media.key] : [])),
  ])
  const gallery = (project.media ?? []).filter((m) => !spokenFor.has(m.key))

  const chapterModels = new Set((project.chapters ?? []).flatMap((c) => (c.model ? [c.model.src] : [])))
  const models = (project.models ?? []).filter((m) => !chapterModels.has(m.src))

  return (
    <article className="pt-24">
      {/* ---------------- Masthead ---------------- */}
      <header className="border-b border-line">
        <div className="mx-auto max-w-[1600px] px-6 py-12 md:px-10 md:py-16">
          <Link
            to="/#work"
            className="label inline-flex items-center gap-2 transition-colors hover:text-signal"
          >
            <span aria-hidden="true">←</span> All work
          </Link>

          <motion.div
            variants={staggerParent}
            initial="hidden"
            animate="show"
            className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12"
          >
            <div className="lg:col-span-7">
              <motion.div variants={riseIn} className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="label label-signal">{actById[project.act].verb}</span>
                <ActSpans spans={project.spans} />
              </motion.div>

              <motion.h1
                variants={riseIn}
                className="mt-6 text-[clamp(2.1rem,5vw,4rem)] leading-[1.02] font-medium tracking-[-0.035em]"
              >
                {project.title}
              </motion.h1>

              <motion.p
                variants={riseIn}
                className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-muted"
              >
                {project.subtitle}
              </motion.p>

              <motion.p
                variants={riseIn}
                className="mt-8 max-w-2xl border-l border-signal pl-5 text-[17px] leading-relaxed text-ink-soft md:text-[18px]"
              >
                {project.oneLiner}
              </motion.p>
            </div>

            <motion.dl variants={riseIn} className="lg:col-span-4 lg:col-start-9">
              <div className="border-t border-line py-3">
                <dt className="label">Organisation</dt>
                <dd className="mt-1 text-[15px]">{project.org}</dd>
              </div>
              <div className="border-t border-line py-3">
                <dt className="label">Role</dt>
                <dd className="mt-1 text-[15px]">{project.role}</dd>
              </div>
              <div className="border-t border-line py-3">
                <dt className="label">Period</dt>
                <dd className="mt-1 text-[15px] tnum">{project.period}</dd>
              </div>
              {project.team && (
                <div className="border-t border-line py-3">
                  <dt className="label">Team</dt>
                  <dd className="mt-1 text-[15px]">{project.team}</dd>
                </div>
              )}
              <div className="border-t border-b border-line py-3">
                <dt className="label">Tools</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {project.stack.map((tool) => (
                    <span
                      key={tool}
                      className="border border-line px-2 py-0.5 font-mono text-[10.5px] tracking-[0.08em] text-ink-muted uppercase"
                    >
                      {tool}
                    </span>
                  ))}
                </dd>
              </div>
            </motion.dl>
          </motion.div>
        </div>
      </header>

      {/* ---------------- Metrics ---------------- */}
      {project.headlineMetrics.length > 0 && (
        <section aria-label="Key figures" className="border-b border-line bg-card">
          <dl className="mx-auto flex max-w-[1600px] flex-wrap gap-x-16 gap-y-8 px-6 py-9 md:px-10">
            {project.headlineMetrics.map((metric) => (
              <div key={metric.label}>
                <dt className="text-[clamp(1.7rem,3vw,2.5rem)] leading-none font-medium tracking-[-0.03em] tnum">
                  <CountUp value={metric.value} />
                  {metric.unit && (
                    <span className="ml-1.5 font-mono text-[0.44em] tracking-wide text-ink-muted">
                      {metric.unit}
                    </span>
                  )}
                </dt>
                <dd className="mt-2.5 text-[13px] text-ink-muted">{metric.label}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* ---------------- Hero media ---------------- */}
      <section className="border-b border-line bg-paper-deep py-12 md:py-16">
        <div className="mx-auto max-w-[1200px] px-6 md:px-10">
          <Media item={hero} priority />
        </div>
      </section>

      {/* ---------------- Problem / what I did ---------------- */}
      <section className="border-b border-line py-16 md:py-24">
        <motion.div
          className="mx-auto grid max-w-[1600px] grid-cols-1 gap-12 px-6 md:px-10 lg:grid-cols-12 lg:gap-16"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <motion.div variants={riseIn} className="lg:col-span-5">
            <div className="flex items-center gap-4">
              <span className="label tnum">01</span>
              <span className="h-px w-12 bg-line-strong" />
              <span className="label label-signal">The problem</span>
            </div>
            <p className="mt-6 text-[16.5px] leading-relaxed text-ink-soft">{project.problem}</p>
          </motion.div>

          <motion.div variants={riseIn} className="lg:col-span-6 lg:col-start-7">
            <div className="flex items-center gap-4">
              <span className="label tnum">02</span>
              <span className="h-px w-12 bg-line-strong" />
              <span className="label label-signal">What I did</span>
            </div>
            <ul className="mt-6">
              {project.did.map((item, i) => (
                <li key={item} className="flex gap-5 border-b border-line py-4 first:border-t">
                  <span className="label tnum shrink-0 pt-1">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-[15.5px] leading-relaxed text-ink-soft">{item}</p>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      </section>

      {/* ---------------- Outcome ---------------- */}
      <section className="border-b border-line bg-card py-16 md:py-20">
        <motion.div
          className="mx-auto max-w-[1600px] px-6 md:px-10"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <motion.div variants={riseIn} className="flex items-center gap-4">
            <span className="label tnum">03</span>
            <span className="h-px w-12 bg-line-strong" />
            <span className="label label-signal">Outcome</span>
          </motion.div>

          <motion.ul variants={staggerParent} className="mt-8 grid grid-cols-1 gap-x-14 md:grid-cols-2">
            {project.outcome.map((item) => (
              <motion.li
                key={item}
                variants={riseIn}
                className="flex gap-4 border-t border-line py-5"
              >
                <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-signal" />
                <p className="text-[15.5px] leading-relaxed text-ink-soft">{item}</p>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </section>

      {/* ---------------- Chapters ---------------- */}
      {project.chapters && project.chapters.length > 0 && (
        <section className="border-b border-line py-16 md:py-24">
          <div className="mx-auto max-w-[1600px] px-6 md:px-10">
            <div className="flex items-center gap-4">
              <span className="label tnum">04</span>
              <span className="h-px w-12 bg-line-strong" />
              <span className="label label-signal">How it went, stage by stage</span>
            </div>

            <div className="mt-12 flex flex-col gap-16 md:gap-24">
              {project.chapters.map((chapter) => (
                <motion.div
                  key={chapter.code}
                  variants={staggerParent}
                  initial="hidden"
                  whileInView="show"
                  viewport={viewportOnce}
                  className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-14"
                >
                  <motion.div variants={riseIn} className="lg:col-span-4">
                    <div className="lg:sticky lg:top-28">
                      <div className="flex items-baseline gap-4">
                        <span className="font-mono text-[2.4rem] leading-none font-medium text-ink-faint tnum">
                          {chapter.code}
                        </span>
                        <span className="label label-signal">
                          {actById[chapter.act].verb}
                        </span>
                      </div>
                      <h3 className="mt-5 text-[1.5rem] leading-[1.15] font-medium tracking-[-0.02em]">
                        {chapter.title}
                      </h3>
                      <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
                        {chapter.body}
                      </p>
                    </div>
                  </motion.div>

                  <motion.div variants={riseIn} className="lg:col-span-8">
                    {chapter.model && <Model item={chapter.model} />}
                    {chapter.media && <Media item={chapter.media} />}
                    {chapter.interactive && <InteractiveSlot id={chapter.interactive} />}
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Standalone interactive ---------------- */}
      {project.interactive && !project.chapters && (
        <section className="border-b border-line py-16 md:py-20">
          <div className="mx-auto max-w-[1600px] px-6 md:px-10">
            <div className="flex items-center gap-4">
              <span className="label tnum">04</span>
              <span className="h-px w-12 bg-line-strong" />
              <span className="label label-signal">Try it</span>
            </div>
            <div className="mt-8">
              <InteractiveSlot id={project.interactive} />
            </div>
          </div>
        </section>
      )}

      {/* ---------------- CAD ---------------- */}
      {models.length > 0 && (
        <section className="border-b border-line bg-paper-deep py-16 md:py-20">
          <div className="mx-auto max-w-[1600px] px-6 md:px-10">
            <div className="flex items-center gap-4">
              <span className="label tnum">05</span>
              <span className="h-px w-12 bg-line-strong" />
              <span className="label label-signal">The hardware</span>
            </div>
            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
              {models.map((model) => (
                <Model key={model.src} item={model} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------------- Gallery ---------------- */}
      {gallery.length > 0 && (
        <section className="border-b border-line bg-paper-deep py-16 md:py-20">
          <div className="mx-auto max-w-[1600px] px-6 md:px-10">
            <div className="flex items-center gap-4">
              <span className="label tnum">06</span>
              <span className="h-px w-12 bg-line-strong" />
              <span className="label label-signal">From the build</span>
            </div>

            <motion.div
              className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
              variants={staggerParent}
              initial="hidden"
              whileInView="show"
              viewport={viewportOnce}
            >
              {gallery.map((item) => (
                <motion.div key={item.key} variants={riseIn}>
                  <Media item={item} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* ---------------- Downloads ---------------- */}
      {project.docs && project.docs.length > 0 && (
        <section className="border-b border-line py-14">
          <div className="mx-auto max-w-[1600px] px-6 md:px-10">
            <div className="flex items-center gap-4">
              <span className="label tnum">07</span>
              <span className="h-px w-12 bg-line-strong" />
              <span className="label label-signal">Go deeper</span>
            </div>

            <ul className="mt-7 flex flex-col">
              {project.docs.map((doc) => (
                <li key={doc.href} className="border-t border-line last:border-b">
                  <a
                    href={doc.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex flex-wrap items-center gap-x-6 gap-y-1 py-4 transition-colors hover:text-signal"
                  >
                    <span className="label w-24 shrink-0">{DOC_KIND[doc.kind] ?? doc.kind}</span>
                    <span className="flex-1 text-[15.5px] font-medium">{doc.label}</span>
                    {doc.size && <span className="label tnum">{doc.size}</span>}
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    >
                      ↓
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ---------------- Next ---------------- */}
      <nav className="py-16 md:py-20">
        <div className="mx-auto max-w-[1600px] px-6 md:px-10">
          <Link to={`/work/${next.slug}`} className="group block border-t border-line pt-8">
            <span className="label">Next project</span>
            <span className="mt-3 flex flex-wrap items-baseline justify-between gap-4">
              <span className="text-[clamp(1.5rem,3.4vw,2.6rem)] leading-tight font-medium tracking-[-0.03em] transition-colors group-hover:text-signal">
                {next.title}
              </span>
              <span
                aria-hidden="true"
                className="text-2xl transition-transform duration-300 group-hover:translate-x-2"
              >
                →
              </span>
            </span>
            <span className="mt-2 block text-[15px] text-ink-muted">{next.subtitle}</span>
          </Link>
        </div>
      </nav>
    </article>
  )
}
