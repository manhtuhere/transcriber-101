import { POSITION_KEY_PREFIX } from '../constants/playback'
import type { ChapterPosition, ManifestChapter } from '../types/manifest'

/**
 * Position within the whole book, given a chapter and the `currentTime` of its
 * audio element. This is the chapter-marker scheme: the book is never one file,
 * but the scrub bar behaves as if it were.
 */
export function toBookPosition(chapter: ManifestChapter, currentTime: number): number {
  return chapter.startOffsetSec + currentTime
}

/**
 * The inverse: which chapter file to load, and where to seek within it.
 *
 * A position exactly on a boundary belongs to the chapter it starts. Out-of-
 * range positions clamp rather than throw, because they arrive from a scrub bar
 * and from restored `localStorage` values that may predate an edit.
 */
export function toChapterPosition(
  chapters: ManifestChapter[],
  bookSeconds: number,
): ChapterPosition {
  if (chapters.length === 0) return { idx: 0, offsetInChapter: 0 }

  const first = chapters[0]!
  if (bookSeconds <= first.startOffsetSec) {
    return { idx: first.idx, offsetInChapter: 0 }
  }

  const last = chapters[chapters.length - 1]!
  const end = last.startOffsetSec + last.durationSec
  if (bookSeconds >= end) {
    return { idx: last.idx, offsetInChapter: last.durationSec }
  }

  // Walk backwards so a boundary lands on the chapter it opens.
  for (let i = chapters.length - 1; i >= 0; i -= 1) {
    const chapter = chapters[i]!
    if (bookSeconds >= chapter.startOffsetSec) {
      return { idx: chapter.idx, offsetInChapter: bookSeconds - chapter.startOffsetSec }
    }
  }

  return { idx: first.idx, offsetInChapter: 0 }
}

/** localStorage key for a book's resume position. */
export function positionKey(bookId: string): string {
  return `${POSITION_KEY_PREFIX}${bookId}`
}

/** A stored position is only usable if it parses as a finite, non-negative number. */
export function readSavedPosition(bookId: string): number {
  try {
    const raw = localStorage.getItem(positionKey(bookId))
    if (raw === null) return 0
    const seconds = Number(raw)
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : 0
  } catch {
    // Private windows can throw on access; playback should still work.
    return 0
  }
}

export function savePosition(bookId: string, seconds: number): void {
  try {
    localStorage.setItem(positionKey(bookId), String(seconds))
  } catch {
    // Storage disabled: resume is a convenience, not a requirement.
  }
}
