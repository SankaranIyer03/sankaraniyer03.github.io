import { useState } from 'react'
import { getMedia } from '../../lib/media'

interface FigureProps {
  /** Key into the generated media manifest, e.g. "terraprobe/04". */
  media: string
  alt: string
  /** Which rendition to request as the primary source. */
  size?: 'small' | 'mid' | 'large'
  className?: string
  imgClassName?: string
  sizes?: string
  priority?: boolean
  /** Fill a parent of known height instead of using the source aspect. */
  fill?: boolean
}

/**
 * Responsive picture with an inlined 16px blur placeholder, so images resolve
 * from a soft wash rather than popping in.
 */
export function Figure({
  media,
  alt,
  size = 'mid',
  className = '',
  imgClassName = '',
  sizes = '(max-width: 768px) 100vw, 50vw',
  priority = false,
  fill = false,
}: FigureProps) {
  const entry = getMedia(media)
  const [loaded, setLoaded] = useState(false)

  if (!entry) {
    return (
      <div
        className={`grid place-items-center border border-line bg-paper-deep ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="label">missing · {media}</span>
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden bg-paper-deep ${fill ? 'h-full' : ''} ${className}`}
      style={
        !fill && entry.aspect && !className.includes('aspect-')
          ? { aspectRatio: String(entry.aspect) }
          : undefined
      }
    >
      <img
        src={entry.lqip}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full scale-110 object-cover blur-xl transition-opacity duration-700 ${
          loaded ? 'opacity-0' : 'opacity-100'
        }`}
      />
      <picture>
        <source type="image/avif" srcSet={entry.midAvif} sizes={sizes} />
        <source
          type="image/webp"
          srcSet={`${entry.small} 480w, ${entry.mid} 1000w, ${entry.large} 1800w`}
          sizes={sizes}
        />
        <img
          src={entry[size]}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={`relative h-full w-full object-cover transition-opacity duration-700 ${
            loaded ? 'opacity-100' : 'opacity-0'
          } ${imgClassName}`}
        />
      </picture>
    </div>
  )
}
