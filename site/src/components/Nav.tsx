import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { profile } from '../content/profile'
import { scrollTo } from '../lib/useSmoothScroll'

const items = [
  { id: 'thesis', label: 'Thesis' },
  { id: 'work', label: 'Work' },
  { id: 'experience', label: 'Experience' },
  { id: 'research', label: 'Research' },
  { id: 'toolbox', label: 'Toolbox' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState<string>('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id)
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const item of items) {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <motion.header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled ? 'border-b border-line bg-paper/85 backdrop-blur-md' : ''
      }`}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.1 }}
    >
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 md:px-10">
        <button
          type="button"
          onClick={() => scrollTo('#top')}
          className="group flex items-baseline gap-2.5 text-left"
        >
          <span className="text-[15px] font-medium tracking-tight">{profile.name}</span>
          <span className="hidden font-mono text-[11px] tracking-wide text-ink-muted sm:inline">
            / Manufacturing Systems
          </span>
        </button>

        <div className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(`#${item.id}`)}
              className={`relative px-3 py-2 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors ${
                active === item.id ? 'text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {item.label}
              {active === item.id && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-x-2 -bottom-px h-[2px] bg-signal"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={profile.links.linkedin}
            target="_blank"
            rel="noreferrer"
            className="hidden border border-line-strong px-3 py-2 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors hover:border-ink hover:bg-card sm:inline-block"
          >
            LinkedIn
          </a>
          <button
            type="button"
            onClick={() => scrollTo('#contact')}
            className="border border-ink bg-ink px-4 py-2 font-mono text-[11px] tracking-[0.12em] text-paper uppercase transition-colors hover:border-signal hover:bg-signal"
          >
            Contact
          </button>
        </div>
      </nav>
    </motion.header>
  )
}
