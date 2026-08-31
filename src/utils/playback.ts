import { DEFAULT_SPEED, PLAYBACK_SPEEDS, POSITION_KEY_PREFIX, SPEED_KEY } from '../constants/playback'
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

/** How far the skip controls move, in seconds. */
export const SKIP_SECONDS = 30

/**
 * Skip forward or back in book time, clamped to the book.
 *
 * Book time, not chapter time, so skipping past the end of a chapter lands in
 * the next one rather than stopping at a file boundary.
 */
export function skipTo(bookPosition: number, deltaSec: number, totalSec: number): number {
  return Math.min(Math.max(bookPosition + deltaSec, 0), Math.max(totalSec, 0))
}

/** Seconds left in the chapter containing `bookPosition`, for an end-of-chapter timer. */
export function secondsToChapterEnd(
  chapters: ManifestChapter[],
  bookPosition: number,
): number {
  const { idx, offsetInChapter } = toChapterPosition(chapters, bookPosition)
  const chapter = chapters.find((entry) => entry.idx === idx)
  if (!chapter) return 0
  return Math.max(chapter.durationSec - offsetInChapter, 0)
}

/**
 * A stored speed is only usable if it is one we actually offer — a stale value
 * from an older build, or a hand-edited one, must not put playback at 3x with
 * no way to see why.
 */
export function parseSpeed(raw: string | null): number {
  const speed = Number(raw)
  return (PLAYBACK_SPEEDS as readonly number[]).includes(speed) ? speed : DEFAULT_SPEED
}

export function readSavedSpeed(): number {
  try {
    return parseSpeed(localStorage.getItem(SPEED_KEY))
  } catch {
    return DEFAULT_SPEED
  }
}

export function saveSpeed(speed: number): void {
  try {
    localStorage.setItem(SPEED_KEY, String(speed))
  } catch {
    // Storage disabled: the preference simply will not survive a reload.
  }
}
