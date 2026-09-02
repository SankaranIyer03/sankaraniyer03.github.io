import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav'
import Home from './pages/Home'
import { useSmoothScroll } from './lib/useSmoothScroll'

/* Project pages pull in the heavy interactive widgets and the 3D viewer, so
   they stay out of the entry bundle. */
const ProjectPage = lazy(() => import('./pages/ProjectPage'))

function PageFallback() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <span className="label animate-pulse">Loading…</span>
    </div>
  )
}

function Shell() {
  useSmoothScroll()

  return (
    <>
      <Nav />
      <main>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/work/:slug" element={<ProjectPage />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
