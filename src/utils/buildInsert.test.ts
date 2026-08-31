import { describe, expect, test } from 'vitest'
import type { ParsedChapter } from '../types/book'
import { buildBookDraft } from './buildInsert'

const chapters: ParsedChapter[] = [
  { idx: 0, title: 'One', body: 'first body', charCount: 10 },
  { idx: 1, title: 'Two', body: 'second body', charCount: 11 },
]

const meta = { title: 'A Book', author: 'An Author', voice: 'aura-2-athena-en' }

describe('buildBookDraft', () => {
  test('book status is "processing" on queue', () => {
    expect(buildBookDraft(meta, chapters).book.status).toBe('processing')
  })

  test('book carries the title and author', () => {
    const { book } = buildBookDraft(meta, chapters)
    expect(book.title).toBe('A Book')
    expect(book.author).toBe('An Author')
  })

  test('every chapter row starts at status "pending"', () => {
    const draft = buildBookDraft(meta, chapters)
    expect(draft.chapters.map((c) => c.status)).toEqual(['pending', 'pending'])
  })

  test('chapter rows carry idx, title, text_content and char_count', () => {
    const [first] = buildBookDraft(meta, chapters).chapters
    expect(first).toMatchObject({
      idx: 0,
      title: 'One',
      text_content: 'first body',
      char_count: 10,
    })
  })

  test('every chapter gets the selected voice', () => {
    const draft = buildBookDraft({ ...meta, voice: 'aura-asteria-en' }, chapters)
    expect(draft.chapters.every((c) => c.tts_voice === 'aura-asteria-en')).toBe(true)
  })

  test('source_hash is stable for identical text', () => {
    expect(buildBookDraft(meta, chapters).book.source_hash).toBe(
      buildBookDraft(meta, chapters).book.source_hash,
    )
  })

  test('source_hash differs when any chapter body changes', () => {
    const edited = [chapters[0]!, { ...chapters[1]!, body: 'edited body' }]
    expect(buildBookDraft(meta, edited).book.source_hash).not.toBe(
      buildBookDraft(meta, chapters).book.source_hash,
    )
  })

  test('source_hash ignores the chapter title, which is only a label', () => {
    const retitled = [{ ...chapters[0]!, title: 'Renamed' }, chapters[1]!]
    expect(buildBookDraft(meta, retitled).book.source_hash).toBe(
      buildBookDraft(meta, chapters).book.source_hash,
    )
  })

  test('audio_path, duration_sec and start_offset_sec are null before synthesis', () => {
    const [first] = buildBookDraft(meta, chapters).chapters
    expect(first!.audio_path).toBeNull()
    expect(first!.duration_sec).toBeNull()
    expect(first!.start_offset_sec).toBeNull()
  })

  test('total_duration_sec is null before synthesis', () => {
    expect(buildBookDraft(meta, chapters).book.total_duration_sec).toBeNull()
  })

  test('renumbers chapters contiguously from 0 regardless of input idx', () => {
    const gapped: ParsedChapter[] = [
      { idx: 5, title: 'One', body: 'a', charCount: 1 },
      { idx: 9, title: 'Two', body: 'b', charCount: 1 },
    ]
    expect(buildBookDraft(meta, gapped).chapters.map((c) => c.idx)).toEqual([0, 1])
  })
})
