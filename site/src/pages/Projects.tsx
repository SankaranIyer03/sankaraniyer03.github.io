import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { acts, type ActId } from '../content/acts'
import { projects } from '../content/projects'
import { PageHead } from '../components/primitives/PageHead'
import { ThreadMap } from '../components/projects/ThreadMap'
import { Footer } from '../components/Footer'
import { viewportOnce } from '../lib/motion'

const actIds = acts.map((a) => a.id) as string[]

/**
 * The index is the lifecycle, not a résumé. Four stages across, a project
 * card under the stage where the work actually sat. Detail lives on the
 * case-study page.
 */
export default function Projects() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('act')
  const activeAct = raw && actIds.includes(raw) ? (raw as ActId) : null

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const setAct = (id: ActId | null) => {
    const next = new URLSearchParams(params)
    if (id) next.set('act', id)
    else next.delete('act')
    setParams(next, { replace: true })
  }

  return (
    <>
      <PageHead
        index="03"
        kicker="Projects"
        title={
          <>
            Design. Manufacture. Digital Thread.{' '}
            <span className="text-signal">Business Value.</span>
          </>
        }
        lede="Click a project to see what I did at that stage of the lifecycle."
        meta={`${projects.length} projects`}
      >
        <div className="mt-10 flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="label mr-2">Stage</span>
          <button
            type="button"
            onClick={() => setAct(null)}
            aria-pressed={activeAct === null}
            className={`border px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] uppercase transition-colors ${
              activeAct === null
                ? 'border-ink bg-ink text-paper'
                : 'border-line-strong text-ink-muted hover:border-ink hover:text-ink'
            }`}
          >
            All
          </button>
          {acts.map((act) => (
            <button
              key={act.id}
              type="button"
              onClick={() => setAct(act.id)}
              aria-pressed={activeAct === act.id}
              className={`border px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] uppercase transition-colors ${
                activeAct === act.id
                  ? 'border-signal bg-signal text-paper'
                  : 'border-line-strong text-ink-muted hover:border-ink hover:text-ink'
              }`}
            >
              <span className="tnum mr-1.5 opacity-60">{act.code}</span>
              {act.name}
            </button>
          ))}
        </div>
      </PageHead>

      <section className="border-b border-line py-16 md:py-20">
        <div className="mx-auto max-w-[1600px] px-6 md:px-10">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.6 }}
          >
            <ThreadMap activeAct={activeAct} />
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  )
}
