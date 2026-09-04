import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, test } from 'vitest'
import { MAX_BOOK_CHARS, MAX_UPLOAD_BYTES } from '../../src/constants/upload'
import { estimateCost } from '../../src/utils/estimate'
import { splitChapters } from '../../src/utils/splitChapters'
import { chunkText, MAX_CHUNK_CHARS } from '../../scripts/lib/chunkText'
import { buildTranscript, measure, type Fixture } from './fixture'

const MB = 1024 * 1024
const TARGET_BYTES = 50 * MB
const CHAPTERS = 60

let fixture: Fixture
let text: string

beforeAll(async () => {
  fixture = await buildTranscript(TARGET_BYTES, CHAPTERS)
  text = readFileSync(fixture.path, 'utf8')
}, 300_000)

describe('a 50 MB transcript', () => {
  test('the fixture really is about 50 MB', () => {
    expect(fixture.bytes).toBeGreaterThan(45 * MB)
    console.log(`fixture: ${(fixture.bytes / MB).toFixed(1)} MB, ${CHAPTERS} chapters`)
  })

  /*
    The guards, first. This is the behaviour a reader actually meets today: a
    50 MB book is refused, and refused on `file.size` — before anything reads
    it. Reading first would freeze the tab for seconds on a file that was
    never going to be accepted.
  */
  test('is refused by the upload size cap', () => {
    expect(fixture.bytes).toBeGreaterThan(MAX_UPLOAD_BYTES)
    expect(MAX_UPLOAD_BYTES / MB).toBe(5)
  })

  test('would also blow the character cap by two orders of magnitude', () => {
    const chars = text.length
    expect(chars).toBeGreaterThan(MAX_BOOK_CHARS * 50)
    console.log(
      `chars: ${chars.toLocaleString()} vs cap ${MAX_BOOK_CHARS.toLocaleString()} ` +
        `(${Math.round(chars / MAX_BOOK_CHARS)}x)`,
    )
  })

  // The cap exists to stop exactly this being queued by accident.
  test('would cost a fortune to synthesize if the cap were lifted', () => {
    const { usd } = estimateCost(text.length, 'aura-2-athena-en')
    expect(usd).toBeGreaterThan(100)
    console.log(`synthesis cost if uncapped: $${usd.toFixed(2)}`)
  })
})

/*
  The parser is capped well below this today, but it is the piece that would
  have to hold if the cap were ever raised, so it is worth knowing where it
  stands rather than guessing.
*/
describe('splitChapters at 50 MB', () => {
  test('finds every chapter', () => {
    const { result, ms, heapMb } = measure(() => splitChapters(text))

    expect(result).toHaveLength(CHAPTERS)
    console.log(`splitChapters: ${ms.toFixed(0)} ms, +${heapMb.toFixed(0)} MB heap`)
  })

  test('keeps the chapter text intact, not merely the count', () => {
    const chapters = splitChapters(text)

    expect(chapters[0]!.title).toBe('Chapter 1')
    expect(chapters[CHAPTERS - 1]!.title).toBe(`Chapter ${CHAPTERS}`)
    // Every chapter carries real body text, so a chapter is not silently empty.
    for (const chapter of chapters) expect(chapter.charCount).toBeGreaterThan(1000)
  })

  test('the parsed characters add up to about the file', () => {
    const chapters = splitChapters(text)
    const total = chapters.reduce((sum, c) => sum + c.charCount, 0)

    // Delimiters, headings and trimmed blank lines are dropped, so the parsed
    // total is a little under the raw file rather than equal to it.
    expect(total).toBeGreaterThan(text.length * 0.95)
    expect(total).toBeLessThanOrEqual(text.length)
  })
})

describe('chunkText on a very large chapter', () => {
  test('chunks a whole 50 MB book without exceeding the Deepgram limit', () => {
    const chapters = splitChapters(text)
    const { result, ms } = measure(() => chapters.map((c) => chunkText(c.body)))
    const all = result.flat()

    expect(all.length).toBeGreaterThan(0)
    for (const chunk of all) expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS)

    console.log(`chunkText: ${all.length.toLocaleString()} chunks in ${ms.toFixed(0)} ms`)
  })

  test('a single 800 KB chapter still chunks under the limit', () => {
    const chapters = splitChapters(text)
    const biggest = chapters.reduce((a, b) => (a.charCount > b.charCount ? a : b))
    const chunks = chunkText(biggest.body)

    expect(chunks.length).toBeGreaterThan(100)
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS)
  })
})
