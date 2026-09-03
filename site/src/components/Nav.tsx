import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { profile } from '../content/profile'
import { easePrecise } from '../lib/motion'

const items = [
  { to: '/projects', label: 'Projects' },
  { to: '/experience', label: 'Experience' },
  { to: '/research', label: 'Research' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `relative px-3 py-2 font-mono text-[11px] tracking-[0.12em] uppercase transition-colors ${
    isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'
  }`

/**
 * Now a page-level nav rather than a scroll-spy, each destination is its own
 * route, so active state comes from the router instead of an
 * IntersectionObserver guessing which section is centred.
 */
export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const onHome = pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // A route change while the mobile sheet is open should close it.
  useEffect(() => setMenuOpen(false), [pathname])

  return (
    <motion.header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled || !onHome || menuOpen
          ? 'border-b border-line bg-paper/85 backdrop-blur-md'
          : ''
      }`}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.1 }}
    >
      <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-4 md:px-10">
        <Link to="/" className="group flex items-baseline gap-2.5 text-left">
          <span className="text-[15px] font-medium tracking-tight">{profile.name}</span>
          <span className="hidden font-mono text-[11px] tracking-wide text-ink-muted sm:inline">
            / Manufacturing Systems
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-x-2 -bottom-px h-[2px] bg-signal"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
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
          <a
            href={`mailto:${profile.links.email}`}
            className="border border-ink bg-ink px-4 py-2 font-mono text-[11px] tracking-[0.12em] text-paper uppercase transition-colors hover:border-signal hover:bg-signal"
          >
            Contact
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
            className="grid h-9 w-9 place-items-center border border-line-strong font-mono text-sm transition-colors hover:border-ink lg:hidden"
          >
            {menuOpen ? '×' : '≡'}
          </button>
        </div>
      </nav>

      {/* ---------------- Mobile sheet ---------------- */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: easePrecise }}
            className="overflow-hidden border-t border-line lg:hidden"
          >
            <ul className="mx-auto max-w-[1600px] px-6 py-2 md:px-10">
              {items.map((item) => (
                <li key={item.to} className="border-b border-line last:border-b-0">
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `block py-4 font-mono text-[12px] tracking-[0.12em] uppercase transition-colors ${
                        isActive ? 'text-signal' : 'text-ink-soft hover:text-ink'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
