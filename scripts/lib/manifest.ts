export interface ManifestChapter {
  idx: number
  title: string
  audio_path: string | null
  duration_sec: number | null
}

export interface ManifestBook {
  id: string
  title: string
  author: string | null
}

export interface Manifest {
  bookId: string
  title: string
  author: string | null
  totalDurationSec: number
  chapters: {
    idx: number
    title: string
    path: string
    startOffsetSec: number
    durationSec: number
  }[]
}

/**
 * Build the per-book manifest the player reads.
 *
 * `startOffsetSec` is the cumulative duration of every preceding chapter, and
 * it is the whole chapter-marker scheme: the player treats
 * `startOffsetSec + audio.currentTime` as the position in the book, which gives
 * a continuous scrub bar without ever concatenating the audio into one file.
 */
export function buildManifest(book: ManifestBook, chapters: ManifestChapter[]): Manifest {
  if (chapters.length === 0) {
    throw new Error(`Cannot build a manifest for book ${book.id}: no chapters.`)
  }

  const ordered = [...chapters].sort((a, b) => a.idx - b.idx)

  let offset = 0
  const entries = ordered.map((chapter) => {
    if (chapter.duration_sec === null) {
      throw new Error(`Chapter ${chapter.idx} has no duration; the book is not finished.`)
    }
    if (chapter.audio_path === null) {
      throw new Error(`Chapter ${chapter.idx} has no audio path; the book is not finished.`)
    }

    const entry = {
      idx: chapter.idx,
      title: chapter.title,
      path: chapter.audio_path,
      startOffsetSec: offset,
      durationSec: chapter.duration_sec,
    }
    offset += chapter.duration_sec
    return entry
  })

  return {
    bookId: book.id,
    title: book.title,
    author: book.author,
    totalDurationSec: offset,
    chapters: entries,
  }
}
