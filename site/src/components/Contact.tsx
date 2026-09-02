import { motion } from 'motion/react'
import { profile } from '../content/profile'
import { Figure } from './primitives/Figure'
import { riseIn, staggerParent, viewportOnce } from '../lib/motion'

const links = [
  { label: 'Email', value: profile.links.email, href: `mailto:${profile.links.email}` },
  { label: 'LinkedIn', value: '/in/siyer03', href: profile.links.linkedin },
  { label: 'GitHub', value: '/SankaranIyer03', href: profile.links.github },
]

export function Contact() {
  return (
    <>
      <section id="contact" className="relative overflow-hidden border-b border-line">
        <div className="bp-grid bp-mask pointer-events-none absolute inset-0 opacity-60" />

        <motion.div
          className="relative mx-auto max-w-[1600px] px-6 py-28 md:px-10 md:py-36"
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <motion.div variants={riseIn} className="flex items-center gap-4">
            <span className="label tnum">07</span>
            <span className="h-px w-16 bg-line-strong" />
            <span className="label label-signal">Contact</span>
          </motion.div>

          <div className="mt-7 grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <motion.h2
                variants={riseIn}
                className="max-w-4xl text-[clamp(2rem,5vw,3.8rem)] leading-[1.02] font-medium tracking-[-0.035em]"
              >
                Looking for someone to own a product from CAD to the floor.
              </motion.h2>

              <motion.p
                variants={riseIn}
                className="mt-8 max-w-2xl text-[17px] leading-relaxed text-ink-muted"
              >
                Graduating from MIT in July 2026 and looking for manufacturing engineering,
                industrialization, and automation roles where the job is the whole loop rather than
                one stage of it. Happy to talk through any of the work above in detail.
              </motion.p>
            </div>

            {/* Small by design — the source file is only 630px square. */}
            <motion.figure
              variants={riseIn}
              className="reg-marks relative lg:col-span-3 lg:col-start-10"
            >
              <div className="border border-line bg-card p-2">
                <Figure
                  media={profile.portrait}
                  alt={profile.name}
                  className="aspect-square w-full"
                  sizes="(max-width: 1024px) 60vw, 20vw"
                />
              </div>
              <figcaption className="label mt-2.5">{profile.name}</figcaption>
            </motion.figure>
          </div>

          <motion.dl variants={riseIn} className="mt-16 grid grid-cols-1 border-t border-line-strong sm:grid-cols-3">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.href.startsWith('mailto') ? undefined : '_blank'}
                rel="noreferrer"
                className="group flex items-center justify-between border-b border-line px-0 py-6 sm:border-r sm:px-6 sm:last:border-r-0 sm:first:pl-0"
              >
                <div>
                  <dt className="label">{link.label}</dt>
                  <dd className="mt-2 text-[15px] break-all text-ink transition-colors group-hover:text-signal">
                    {link.value}
                  </dd>
                </div>
                <span className="ml-4 font-mono text-xs text-ink-faint transition-transform duration-300 group-hover:translate-x-1 group-hover:text-signal">
                  ↗
                </span>
              </a>
            ))}
          </motion.dl>
        </motion.div>
      </section>

      <footer className="mx-auto max-w-[1600px] px-6 py-10 md:px-10">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="label">
            © {new Date().getFullYear()} {profile.name} — {profile.role}
          </p>
          <p className="label">Design it. Make it. Automate it. Prove it.</p>
        </div>
      </footer>
    </>
  )
}
