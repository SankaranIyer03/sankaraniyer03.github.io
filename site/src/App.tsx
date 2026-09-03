import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Nav } from './components/Nav'
import Home from './pages/Home'
import { useSmoothScroll } from './lib/useSmoothScroll'

/* The landing page is the entry bundle. Everything else is split: project
   pages pull in the interactive widgets and the 3D viewer, and the other
   routes are only reached deliberately. */
const Projects = lazy(() => import('./pages/Projects'))
const ProjectPage = lazy(() => import('./pages/ProjectPage'))
const Experience = lazy(() => import('./pages/Experience'))
const ResearchPage = lazy(() => import('./pages/ResearchPage'))

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
            <Route path="/projects" element={<Projects />} />
            <Route path="/work/:slug" element={<ProjectPage />} />
            <Route path="/experience" element={<Experience />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="/entrepreneurship" element={<Navigate to="/work/parkvue" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
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
