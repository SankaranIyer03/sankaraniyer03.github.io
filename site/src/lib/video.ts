import manifest from '../content/video.generated.json'
import type { MediaEntry } from './media'

export interface VideoEntry {
  mp4: string
  /** Poster frame, encoded by the same pipeline as every other image. */
  poster: MediaEntry
  width: number | null
  height: number | null
  aspect: number | null
  /** Seconds, as probed from the source file. */
  duration: number | null
}

const video = manifest as unknown as Record<string, VideoEntry>

export function getVideo(key: string): VideoEntry | undefined {
  return video[key]
}

export const videoKeys = Object.keys(video)
