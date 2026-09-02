import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Hero } from '../components/Hero'
import { ProofBar } from '../components/home/ProofBar'
import { TheLoop } from '../components/home/TheLoop'
import { FeaturedWork } from '../components/home/FeaturedWork'
import { ProjectIndex } from '../components/home/ProjectIndex'
import { Timeline } from '../components/Timeline'
import { Research } from '../components/Research'
import { Toolbox } from '../components/Toolbox'
import { Contact } from '../components/Contact'

/**
 * Ordered for a 20-second read: who and why (hero), proof (numbers), how I
 * work (the loop), what I have built (three cases), then everything a slower
 * reader might want. Nothing below the fold is load-bearing for the pitch.
 */
export default function Home() {
  const { hash } = useLocation()

  // Arriving from a project page at /#work must land on that section.
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const el = document.querySelector(hash)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <>
      <Hero />
      <ProofBar />
      <TheLoop />
      <FeaturedWork />
      <ProjectIndex />
      <Timeline />
      <Research />
      <Toolbox />
      <Contact />
    </>
  )
}
