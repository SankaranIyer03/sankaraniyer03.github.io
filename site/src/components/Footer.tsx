import { profile } from '../content/profile'

const links = [
  { label: 'Email', value: profile.links.email, href: `mailto:${profile.links.email}` },
  { label: 'LinkedIn', value: '/in/siyer03', href: profile.links.linkedin },
]

/**
 * Replaces the old full-height contact section. The nav already carries a
 * Contact button on every page, so this only needs to be reachable, not
 * persuasive.
 */
export function Footer() {
  return (
    <footer id="contact" className="border-t border-line">
      <div className="mx-auto max-w-[1600px] px-6 py-12 md:px-10 md:py-14">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="label">{profile.name}</p>
          </div>

          <dl className="flex flex-wrap gap-x-10 gap-y-4">
            {links.map((link) => (
              <div key={link.label}>
                <dt className="label">{link.label}</dt>
                <dd className="mt-1.5">
                  <a
                    href={link.href}
                    target={link.href.startsWith('mailto') ? undefined : '_blank'}
                    rel="noreferrer"
                    className="group inline-flex items-baseline gap-1.5 text-[14px] break-all text-ink transition-colors hover:text-signal"
                  >
                    {link.value}
                    <span className="font-mono text-[10px] text-ink-faint transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-signal">
                      ↗
                    </span>
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
          <p className="label">
            © {new Date().getFullYear()} {profile.name}, {profile.role}
          </p>
          <p className="label">Design it. Make it. Automate it. Prove it.</p>
        </div>
      </div>
    </footer>
  )
}
