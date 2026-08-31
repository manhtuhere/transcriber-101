/** One chapter as the player sees it. Mirrors the manifest the worker writes. */
export interface ManifestChapter {
  idx: number
  title: string
  path: string
  startOffsetSec: number
  durationSec: number
}

export interface Manifest {
  bookId: string
  title: string
  author: string | null
  totalDurationSec: number
  chapters: ManifestChapter[]
}

/** Where playback is, expressed against a single chapter's audio file. */
export interface ChapterPosition {
  idx: number
  offsetInChapter: number
}
