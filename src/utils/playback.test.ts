import { describe, expect, test } from 'vitest'
import type { ManifestChapter } from '../types/manifest'
import { toBookPosition, toChapterPosition } from './playback'

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
