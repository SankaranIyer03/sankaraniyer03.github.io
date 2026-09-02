import { Component, lazy, Suspense, type ReactNode } from 'react'
import type { InteractiveId } from '../../content/projects'
import { ModelViewer } from '../primitives/ModelViewer'

const SPCChart = lazy(() =>
  import('./SPCChart').then((m) => ({ default: m.SPCChart })),
)
const LineSim = lazy(() => import('./LineSim').then((m) => ({ default: m.LineSim })))
const VisionOverlay = lazy(() =>
  import('./VisionOverlay').then((m) => ({ default: m.VisionOverlay })),
)
const ProliferationCollapse = lazy(() =>
  import('./ProliferationCollapse').then((m) => ({ default: m.ProliferationCollapse })),
)
const ForecastChart = lazy(() =>
  import('./ForecastChart').then((m) => ({ default: m.ForecastChart })),
)
const R2RChart = lazy(() => import('./R2RChart').then((m) => ({ default: m.R2RChart })))

/**
 * Interactive widgets are heavy and independent. If one fails to load the
 * surrounding case study must still read correctly, so each is isolated behind
 * its own boundary rather than taking the page down.
 */
class WidgetBoundary extends Component<{ children: ReactNode; label: string }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="border border-line bg-paper-deep px-5 py-8 text-center">
          <p className="label">{this.props.label} — unavailable</p>
        </div>
      )
    }
    return this.props.children
  }
}

function Loading() {
  return (
    <div className="bp-grid grid min-h-[280px] place-items-center border border-line bg-card">
      <span className="label animate-pulse">Loading model…</span>
    </div>
  )
}

const widgets: Partial<Record<InteractiveId, () => ReactNode>> = {
  'spc-chart': () => <SPCChart />,
  'line-sim': () => <LineSim />,
  'vision-overlay': () => <VisionOverlay />,
  proliferation: () => <ProliferationCollapse />,
  'forecast-chart': () => <ForecastChart />,
  'r2r-chart': () => <R2RChart />,
}

interface InteractiveSlotProps {
  id: InteractiveId
  /** Passed through when the slot is a 3D model view. */
  modelSrc?: string
  modelLabel?: string
  modelCaption?: string
}

export function InteractiveSlot({
  id,
  modelSrc,
  modelLabel = 'CAD model',
  modelCaption,
}: InteractiveSlotProps) {
  if (id === 'model-viewer') {
    return <ModelViewer src={modelSrc} label={modelLabel} caption={modelCaption} />
  }

  const render = widgets[id]
  if (!render) return null

  return (
    <WidgetBoundary label={id}>
      <Suspense fallback={<Loading />}>{render()}</Suspense>
    </WidgetBoundary>
  )
}
