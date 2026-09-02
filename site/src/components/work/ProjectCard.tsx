import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Project } from '../../content/projects'
import { easePrecise, riseIn } from '../../lib/motion'
import { galleryKeys } from '../../lib/media'
import { Figure } from '../primitives/Figure'
import { Gallery } from '../primitives/Gallery'
import { MetricRow } from '../primitives/Metric'
import { InteractiveSlot } from '../interactive/InteractiveSlot'
import { ActSpans } from './ActSpans'
import { StackChips } from './StackChips'

/**
 * Compact card that expands in place. Keeps the stage chapters scannable while
 * still letting a serious reader get the full detail without leaving the page.
 */
export function ProjectCard({ project }: { project: Project }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const gallery = project.gallery ? galleryKeys(project.gallery.prefix, project.gallery.count) : []
  const hasDetail = Boolean(project.owned.length || gallery.length || project.interactive)

  return (
    <motion.article
      id={project.id}
      variants={riseIn}
      className="reg-marks relative scroll-mt-24 border border-line bg-card"
    >
      {project.hero && (
        <Figure
          media={project.hero}
          alt={project.title}
          className="aspect-16/9 border-b border-line"
          sizes="(max-width: 1024px) 100vw, 46vw"
        />
      )}

      <div className="p-6 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ActSpans spans={project.spans} />
          <span className="font-mono text-[10.5px] tracking-[0.08em] text-ink-muted uppercase">
            {project.period}
          </span>
        </div>

        <h4 className="mt-5 text-[1.55rem] leading-[1.12] font-medium tracking-[-0.025em]">
          {project.title}
        </h4>
        <p className="mt-1.5 text-[14.5px] text-ink-muted">{project.subtitle}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10.5px] tracking-[0.08em] uppercase">
          <span className="text-ink-soft">{project.org}</span>
          <span className="text-line-strong">·</span>
          <span className="text-signal">{project.role}</span>
        </div>

        <p className="mt-6 text-[15px] leading-relaxed text-ink">{project.hook}</p>

        {project.metrics && (
          <div className="mt-7">
            <MetricRow metrics={[...project.metrics]} />
          </div>
        )}

        {hasDetail && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="group mt-7 flex w-full items-center justify-between border-t border-line pt-4 text-left"
          >
            <span className="font-mono text-[11px] tracking-[0.12em] uppercase transition-colors group-hover:text-signal">
              {open ? 'Close' : 'Read the detail'}
            </span>
            <motion.span
              className="font-mono text-xs text-ink-muted"
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ duration: 0.3, ease: easePrecise }}
            >
              ↓
            </motion.span>
          </button>
        )}

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={panelId}
              key="panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: easePrecise }}
              className="overflow-hidden"
            >
              <div className="pt-7">
                <p className="text-[14.5px] leading-relaxed text-ink-soft">{project.summary}</p>

                <h5 className="label mt-8">What I owned</h5>
                <ol className="mt-3">
                  {project.owned.map((item, i) => (
                    <li key={i} className="flex gap-4 border-t border-line py-3">
                      <span className="mt-0.5 font-mono text-[10.5px] text-ink-faint tnum">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <p className="text-[14px] leading-relaxed text-ink-soft">{item}</p>
                    </li>
                  ))}
                </ol>

                {project.interactive && (
                  <div className="mt-8">
                    <InteractiveSlot
                      id={project.interactive}
                      modelLabel={project.title}
                      modelCaption="Orbitable 3D view of the designed assembly."
                    />
                  </div>
                )}

                {gallery.length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-baseline justify-between">
                      <p className="label">Build & test record</p>
                      <p className="label tnum">{String(gallery.length).padStart(2, '0')} frames</p>
                    </div>
                    <div className="mt-3">
                      <Gallery keys={gallery} label={project.title} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-7">
          <StackChips stack={project.stack} />
        </div>
      </div>
    </motion.article>
  )
}
