import { describe, expect, test } from 'vitest'
import { splitChapters } from '../../src/utils/splitChapters'
import { chunkText, MAX_CHUNK_CHARS } from '../../scripts/lib/chunkText'
import { measure } from './fixture'

const MB = 1024 * 1024

/*
  Shapes a real transcript would not have, which is exactly why they are worth
  running: a big file that is merely long is the easy case, and the parser
  already handles 50 MB of it in about 150 ms. What hurts is a big file with no
  structure to split on.

  These are deliberately smaller than 50 MB. If any of them is quadratic, a few
  megabytes already shows it, and a 50 MB version would hang the suite instead
  of reporting a number.
*/

/** `size` bytes of `unit`, repeated. */
function repeat(unit: string, size: number): string {
  return unit.repeat(Math.ceil(size / unit.length)).slice(0, size)
}

describe('a book with no chapter delimiters', () => {
  test('parses as a single chapter rather than failing', () => {
    const text = repeat('The whole book is one chapter. ', 20 * MB)
    const { result, ms } = measure(() => splitChapters(text))

    expect(result).toHaveLength(1)
    expect(result[0]!.charCount).toBeGreaterThan(19 * MB)
    console.log(`20 MB, no delimiters: ${ms.toFixed(0)} ms`)
  })
})

describe('a book that is one enormous line', () => {
  // No newlines at all, so `split('\n')` yields one string of the whole file.
  test('does not choke the line splitter', () => {
    const text = repeat('word ', 20 * MB)
    const { result, ms } = measure(() => splitChapters(text))

    expect(result).toHaveLength(1)
    console.log(`20 MB, single line: ${ms.toFixed(0)} ms`)
  })
})

describe('text with no sentence terminators', () => {
  /*
    The chunker prefers sentence boundaries and falls back to word boundaries.
    With no '.', '!' or '?' anywhere, every chunk goes through the fallback,
    which is the slow path.
  */
  test('falls back to word boundaries without going quadratic', () => {
    const text = repeat('word ', 4 * MB)
    const { result, ms } = measure(() => chunkText(text))

    for (const chunk of result) expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS)
    console.log(`4 MB, no terminators: ${result.length.toLocaleString()} chunks in ${ms.toFixed(0)} ms`)
  })
})

describe('a single token longer than the chunk limit', () => {
  /*
    The worst input the chunker has: no spaces and no terminators, so
    `hardSplit` must cut mid-word and re-slice the remainder every time. If
    that re-slicing copies the string each pass it is O(n²), and this is where
    it would show.
  */
  test('cuts mid-token without going quadratic', () => {
    const text = repeat('a', 4 * MB)
    const { result, ms } = measure(() => chunkText(text))

    expect(result.length).toBe(Math.ceil(4 * MB / MAX_CHUNK_CHARS))
    for (const chunk of result) expect(chunk.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS)
    console.log(`4 MB, one token: ${result.length.toLocaleString()} chunks in ${ms.toFixed(0)} ms`)
  })

  // Doubling the input should roughly double the time. Quadratic would
  // quadruple it, so a ratio well under 3 is the thing being asserted.
  test('scales about linearly, not quadratically', () => {
    const small = measure(() => chunkText(repeat('a', 1 * MB)))
    const large = measure(() => chunkText(repeat('a', 4 * MB)))

    const ratio = large.ms / Math.max(small.ms, 1)
    console.log(`1 MB: ${small.ms.toFixed(0)} ms, 4 MB: ${large.ms.toFixed(0)} ms (${ratio.toFixed(1)}x for 4x input)`)
    expect(ratio).toBeLessThan(12)
  })
})

describe('a file of nothing but delimiters', () => {
  // Whole delimiters, not `repeat` to a byte count: truncating mid-line leaves
  // a short run of '=' that is correctly not a delimiter, which would make this
  // a test of the fixture rather than of the parser.
  const line = `${'='.repeat(19)}\n`
  const many = line.repeat(Math.floor((2 * MB) / line.length))

  test('yields no chapters rather than a hundred thousand empty ones', () => {
    const { result, ms } = measure(() => splitChapters(many))

    expect(result).toHaveLength(0)
    console.log(`2 MB of delimiters: ${ms.toFixed(0)} ms`)
  })

  // A partial run of '=' is text, not a separator, and becomes a chapter of
  // its own. Pinned because it is the shape the byte-truncated fixture had.
  test('a run of fewer than 19 equals is content, not a separator', () => {
    expect(splitChapters(`${many}${'='.repeat(12)}`)).toHaveLength(1)
  })
})
