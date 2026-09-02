import { Nav } from './components/Nav'
import { Hero } from './components/Hero'
import { Thesis } from './components/Thesis'
import { WorkSection } from './components/work/WorkSection'
import { Timeline } from './components/Timeline'
import { Research } from './components/Research'
import { Toolbox } from './components/Toolbox'
import { Contact } from './components/Contact'
import { useSmoothScroll } from './lib/useSmoothScroll'

export default function App() {
  useSmoothScroll()

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Thesis />
        <WorkSection />
        <Timeline />
        <Research />
        <Toolbox />
        <Contact />
      </main>
    </>
  )
}
