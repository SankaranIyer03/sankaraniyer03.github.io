import { acts, type ActId } from '../../content/acts'

/**
 * Four squares, filled for each act a project touches. Makes "this one runs the
 * whole loop" legible at a glance without a sentence of explanation.
 */
export function ActSpans({ spans, className = '' }: { spans: readonly ActId[]; className?: string }) {
  const complete = spans.length === acts.length

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex gap-1" role="img" aria-label={`Spans ${spans.length} of 4 stages`}>
        {acts.map((act) => {
          const on = spans.includes(act.id)
          return (
            <span
              key={act.id}
              title={act.verb}
              className={`h-2 w-2 border ${
                on
                  ? complete
                    ? 'border-signal bg-signal'
                    : 'border-ink bg-ink'
                  : 'border-line-strong bg-transparent'
              }`}
            />
          )
        })}
      </div>
      <span className={`label ${complete ? 'label-signal' : ''}`}>
        {complete ? 'Full loop' : `${spans.length} of 4 stages`}
      </span>
    </div>
  )
}
