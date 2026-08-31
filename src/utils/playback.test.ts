import { describe, expect, test } from 'vitest'
import type { ManifestChapter } from '../types/manifest'
import {
  parseSpeed,
  secondsToChapterEnd,
  skipTo,
  toBookPosition,
  toChapterPosition,
} from './playback'

const chapter = (idx: number, startOffsetSec: number, durationSec: number): ManifestChapter => ({
  idx,
  title: `Chapter ${idx + 1}`,
  path: `${idx}.mp3`,
  startOffsetSec,
  durationSec,
})

// 120 s + 90 s + 60 s = 270 s total
const chapters = [chapter(0, 0, 120), chapter(1, 120, 90), chapter(2, 210, 60)]

describe('toBookPosition', () => {
  test('is startOffsetSec plus currentTime', () => {
    expect(toBookPosition(chapters[1]!, 30)).toBe(150)
  })

  test('at the very start of chapter 0 is 0', () => {
    expect(toBookPosition(chapters[0]!, 0)).toBe(0)
  })

  test('at the start of a later chapter is that chapter\'s offset', () => {
    expect(toBookPosition(chapters[2]!, 0)).toBe(210)
  })
})

describe('toChapterPosition', () => {
  test('resolves a position inside the first chapter', () => {
    expect(toChapterPosition(chapters, 45)).toEqual({ idx: 0, offsetInChapter: 45 })
  })

  test('resolves a position inside a later chapter', () => {
    expect(toChapterPosition(chapters, 150)).toEqual({ idx: 1, offsetInChapter: 30 })
  })

  // A boundary belongs to the chapter it starts, not the one it ends.
  test('a position exactly on a chapter boundary resolves to the later chapter', () => {
    expect(toChapterPosition(chapters, 120)).toEqual({ idx: 1, offsetInChapter: 0 })
    expect(toChapterPosition(chapters, 210)).toEqual({ idx: 2, offsetInChapter: 0 })
  })

  test('a position past the end clamps to the end of the final chapter', () => {
    expect(toChapterPosition(chapters, 9999)).toEqual({ idx: 2, offsetInChapter: 60 })
  })

  test('a negative position clamps to chapter 0 at offset 0', () => {
    expect(toChapterPosition(chapters, -50)).toEqual({ idx: 0, offsetInChapter: 0 })
  })

  test('handles a single-chapter book', () => {
    expect(toChapterPosition([chapter(0, 0, 60)], 30)).toEqual({ idx: 0, offsetInChapter: 30 })
  })

  test('returns chapter 0 at 0 for an empty manifest rather than throwing', () => {
    expect(toChapterPosition([], 30)).toEqual({ idx: 0, offsetInChapter: 0 })
  })
})

describe('the two are inverses', () => {
  test('toChapterPosition(toBookPosition(c, t)) returns c and t', () => {
    for (const source of chapters) {
      for (const time of [0, 1, 15.5, source.durationSec - 0.5]) {
        const book = toBookPosition(source, time)
        expect(toChapterPosition(chapters, book)).toEqual({
          idx: source.idx,
          offsetInChapter: time,
        })
      }
    }
  })
})

describe('skipTo', () => {
  test('moves forward by the delta', () => {
    expect(skipTo(100, 30, 270)).toBe(130)
  })

  test('moves back by the delta', () => {
    expect(skipTo(100, -30, 270)).toBe(70)
  })

  // Book time, so a skip near a chapter edge crosses into the next file.
  test('crosses a chapter boundary rather than stopping at it', () => {
    // Chapter 0 ends at 120s; skipping forward from 110 lands inside chapter 1.
    const next = skipTo(110, 30, 270)
    expect(next).toBe(140)
    expect(toChapterPosition(chapters, next).idx).toBe(1)
  })

  test('clamps at the start of the book', () => {
    expect(skipTo(10, -30, 270)).toBe(0)
  })

  test('clamps at the end of the book', () => {
    expect(skipTo(260, 30, 270)).toBe(270)
  })

  test('a zero-length book clamps to zero', () => {
    expect(skipTo(0, 30, 0)).toBe(0)
  })
})

describe('secondsToChapterEnd', () => {
  test('counts from the current spot to the end of that chapter', () => {
    // 30s into a 120s first chapter.
    expect(secondsToChapterEnd(chapters, 30)).toBe(90)
  })

  test('is the full duration at a chapter start', () => {
    expect(secondsToChapterEnd(chapters, 120)).toBe(90)
  })

  test('is zero at the very end of the book', () => {
    expect(secondsToChapterEnd(chapters, 270)).toBe(0)
  })

  test('handles an empty manifest without throwing', () => {
    expect(secondsToChapterEnd([], 10)).toBe(0)
  })
})

describe('parseSpeed', () => {
  test('accepts a speed we offer', () => {
    expect(parseSpeed('1.5')).toBe(1.5)
  })

  test('falls back to normal speed for nothing stored', () => {
    expect(parseSpeed(null)).toBe(1)
  })

  test('falls back for a value that is not a number', () => {
    expect(parseSpeed('fast')).toBe(1)
  })

  // A stale value from an older build must not strand playback at a speed the
  // picker cannot show.
  test('falls back for a number we do not offer', () => {
    expect(parseSpeed('3')).toBe(1)
    expect(parseSpeed('0')).toBe(1)
    expect(parseSpeed('-1')).toBe(1)
  })
})
