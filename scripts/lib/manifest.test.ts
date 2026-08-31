import { describe, expect, test } from 'vitest'
import { buildManifest, type ManifestChapter } from './manifest'

const book = { id: 'b1', title: 'A Book', author: 'An Author' }

const chapter = (idx: number, durationSec: number, over: Partial<ManifestChapter> = {}) => ({
  idx,
  title: `Chapter ${idx + 1}`,
  audio_path: `b1/${idx}-chapter.mp3`,
  duration_sec: durationSec,
  ...over,
})

describe('buildManifest', () => {
  test('startOffsetSec of the first chapter is 0', () => {
    expect(buildManifest(book, [chapter(0, 120)]).chapters[0]!.startOffsetSec).toBe(0)
  })

  test('startOffsetSec accumulates preceding durations', () => {
    const manifest = buildManifest(book, [chapter(0, 120), chapter(1, 90), chapter(2, 60)])
    expect(manifest.chapters.map((c) => c.startOffsetSec)).toEqual([0, 120, 210])
  })

  test('totalDurationSec is the sum of chapter durations', () => {
    const manifest = buildManifest(book, [chapter(0, 120), chapter(1, 90), chapter(2, 60)])
    expect(manifest.totalDurationSec).toBe(270)
  })

  test('chapters are ordered by idx regardless of input order', () => {
    const manifest = buildManifest(book, [chapter(2, 60), chapter(0, 120), chapter(1, 90)])
    expect(manifest.chapters.map((c) => c.idx)).toEqual([0, 1, 2])
    expect(manifest.chapters.map((c) => c.startOffsetSec)).toEqual([0, 120, 210])
  })

  test('carries the book metadata', () => {
    const manifest = buildManifest(book, [chapter(0, 10)])
    expect(manifest).toMatchObject({ bookId: 'b1', title: 'A Book', author: 'An Author' })
  })

  test('carries each chapter title and audio path', () => {
    const [first] = buildManifest(book, [chapter(0, 10)]).chapters
    expect(first).toMatchObject({ title: 'Chapter 1', path: 'b1/0-chapter.mp3' })
  })

  // Refusing to build from an unfinished book is the point: a manifest with a
  // missing duration would silently desync every later chapter's offset.
  test('throws when a chapter is missing a duration', () => {
    expect(() => buildManifest(book, [chapter(0, 120), chapter(1, null as never)])).toThrow(
      /duration/i,
    )
  })

  test('throws when a chapter is missing an audio path', () => {
    expect(() =>
      buildManifest(book, [chapter(0, 120, { audio_path: null as never })]),
    ).toThrow(/audio/i)
  })

  test('throws on an empty chapter list', () => {
    expect(() => buildManifest(book, [])).toThrow(/no chapters/i)
  })
})
