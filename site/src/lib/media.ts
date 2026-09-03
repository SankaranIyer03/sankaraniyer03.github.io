import manifest from '../content/media.generated.json'

export interface MediaEntry {
  small: string
  mid: string
  large: string
  midAvif: string
  lqip: string
  width: number | null
  height: number | null
  aspect: number | null
}

const media = manifest as unknown as Record<string, MediaEntry>

export function getMedia(key: string): MediaEntry | undefined {
  return media[key]
}

/** Builds a numbered gallery key list, e.g. terraprobe/00 … terraprobe/29 */
export function galleryKeys(prefix: string, count: number): string[] {
  const keys: string[] = []
  for (let i = 0; i < count; i++) {
    const padded = String(i).padStart(2, '0')
    if (media[`${prefix}/${padded}`]) keys.push(`${prefix}/${padded}`)
  }
  // Some galleries are 1-indexed (parkvue), some 0-indexed (terraprobe).
  if (!keys.length) {
    for (let i = 1; i <= count; i++) {
      const padded = String(i).padStart(2, '0')
      if (media[`${prefix}/${padded}`]) keys.push(`${prefix}/${padded}`)
    }
  }
  return keys
}

export const mediaKeys = Object.keys(media)
