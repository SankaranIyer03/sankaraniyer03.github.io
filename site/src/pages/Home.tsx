import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { Hero } from '../components/Hero'
import { HowIWork } from '../components/home/HowIWork'
import { Footer } from '../components/Footer'
import { riseIn, staggerParent, viewportOnce } from '../lib/motion'

const destinations = [
  {
    to: '/projects',
    index: '03',
    label: 'Projects',
    note: 'The work, mapped across the digital thread.',
  },
  {
    to: '/experience',
    index: '04',
    label: 'Experience',
    note: 'Manufacturing and operations across GE, Rockwell, and Deloitte.',
  },
  {
    to: '/research',
    index: '05',
    label: 'Research',
    note: 'Industry and academic research.',
  },
]

function WhereNext() {
  return (
    <section className="border-b border-line py-16 md:py-20">
      <div className="mx-auto max-w-[1600px] px-6 md:px-10">
        <div className="flex items-center gap-4">
          <span className="label label-signal">Go deeper</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <motion.ul
          className="mt-8 grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          {destinations.map((dest) => (
            <motion.li key={dest.to} variants={riseIn}>
              <Link
                to={dest.to}
                className="group relative flex h-full flex-col justify-between gap-8 bg-paper p-6 transition-colors duration-300 hover:bg-card md:p-7"
              >
                <span className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-signal transition-transform duration-500 group-hover:scale-x-100" />
                <span className="label tnum text-ink-faint">{dest.index}</span>
                <span>
                  <span className="block text-[1.15rem] font-medium tracking-[-0.015em] transition-colors group-hover:text-signal">
                    {dest.label}
                  </span>
                  <span className="mt-2 block text-[13px] leading-relaxed text-ink-muted">
                    {dest.note}
                  </span>
                </span>
                <span className="font-mono text-sm text-ink-faint transition-transform duration-300 group-hover:translate-x-1 group-hover:text-signal">
                  →
                </span>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  )
}

/**
 * Deliberately short. The first screen answers who this is and where the
 * credentials came from; "How I work" makes the argument. Anything that needs
 * more than a glance lives on its own page,
 * because a recruiter scrolling one long document finds nothing.
 */
export default function Home() {
  const { hash } = useLocation()

  // Arriving from another page at /#how must land on that section.
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
      <HowIWork />
      <WhereNext />
      <Footer />
    </>
  )
}
