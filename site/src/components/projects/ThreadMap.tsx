import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { acts, type ActId } from '../../content/acts'
import { projectOrder, projects, type Project } from '../../content/projects'
import { easePrecise, usePrefersReducedMotion, viewportOnce } from '../../lib/motion'

const rank = new Map<string, number>(projectOrder.map((id, i) => [id, i]))

function inStage(act: ActId): Project[] {
  return projects
    .filter((p) => p.act === act)
    .sort((a, b) => (rank.get(a.id) ?? 99) - (rank.get(b.id) ?? 99))
}

/**
 * Four columns, one stage. Each card is a project that belongs to that stage:
 * title and a short brief, nothing else. Click through for the case study.
 */
export function ThreadMap({ activeAct = null }: { activeAct?: ActId | null }) {
  const reduced = usePrefersReducedMotion()

  return (
    <div>
      <ol className="mb-8 hidden items-center gap-2 xl:flex">
        {acts.map((act, i) => (
          <li key={act.id} className="flex flex-1 items-center gap-2">
            <span className="label label-signal whitespace-nowrap">
              {act.code} {act.name}
            </span>
            {i < acts.length - 1 && (
              <>
                <span className="h-px flex-1 bg-line-strong" />
                <span className="font-mono text-[11px] text-signal" aria-hidden="true">
                  →
                </span>
              </>
            )}
          </li>
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        {acts.map((act) => {
          const items = inStage(act.id)
          const dimmed = activeAct !== null && activeAct !== act.id
          return (
            <section
              key={act.id}
              className={`transition-opacity duration-500 ${dimmed ? 'opacity-30' : 'opacity-100'}`}
            >
              <header className="mb-4 border-b border-line-strong pb-3 xl:hidden">
                <span className="label tnum text-ink-faint">{act.code}</span>
                <h2 className="mt-1 text-[1.2rem] font-medium tracking-[-0.015em]">{act.name}</h2>
              </header>

              <ul className="flex flex-col gap-3">
                {items.map((project, i) => (
                  <motion.li
                    key={project.id}
                    initial={reduced ? { opacity: 1 } : { opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ duration: 0.5, ease: easePrecise, delay: i * 0.05 }}
                  >
                    <Link
                      to={`/work/${project.slug}`}
                      className="group block h-full border border-line bg-card p-4 transition-colors hover:border-ink hover:bg-paper"
                    >
                      <span className="label label-signal">{act.name}</span>
                      <h3 className="mt-2 text-[1.02rem] leading-snug font-medium tracking-[-0.015em] transition-colors group-hover:text-signal">
                        {project.title}
                      </h3>
                      <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                        {project.oneLiner}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.1em] uppercase text-ink-faint transition-colors group-hover:text-signal">
                        Open
                        <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                          →
                        </span>
                      </span>
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
