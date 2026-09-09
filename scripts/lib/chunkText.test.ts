import { describe, expect, test } from 'vitest'
import { chunkText } from './chunkText'

const MAX = 1800

describe('chunkText', () => {
  test('returns one chunk when the text is under the limit', () => {
    expect(chunkText('One short sentence.')).toEqual(['One short sentence.'])
  })

  test('returns an empty array for empty input', () => {
    expect(chunkText('')).toEqual([])
    expect(chunkText('   \n  ')).toEqual([])
  })

  test('never returns a chunk longer than maxChars', () => {
    const text = 'This is a sentence that repeats. '.repeat(400)
    for (const chunk of chunkText(text, MAX)) {
      expect(chunk.length).toBeLessThanOrEqual(MAX)
    }
  })

  test('stays under Deepgram\'s hard 2000-character limit at the default size', () => {
    const text = 'Sentence number one. '.repeat(500)
    for (const chunk of chunkText(text)) {
      expect(chunk.length).toBeLessThan(2000)
    }
  })

  test('splits on sentence boundaries', () => {
    const text = `${'A sentence here. '.repeat(200)}`
    const chunks = chunkText(text, 200)
    // Every chunk but possibly the last ends at a sentence terminator.
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.trimEnd()).toMatch(/[.!?]$/)
    }
  })

  test('never splits inside a word', () => {
    const text = 'Antidisestablishmentarianism is long. '.repeat(100)
    for (const chunk of chunkText(text, 300)) {
      expect(chunk).not.toMatch(/^[a-z]/)
    }
  })

  // The invariant that matters: nothing is dropped and nothing is duplicated,
  // so the listener hears the whole chapter exactly once.
  test('rejoining all chunks reproduces the input', () => {
    const text = 'First sentence. Second one! Third? And a fourth. '.repeat(80)
    expect(chunkText(text, 250).join(' ')).toBe(text.trim().replace(/\s+/g, ' '))
  })

  test('hard-splits a single sentence longer than maxChars', () => {
    const runOn = `${'word '.repeat(500)}.`
    const chunks = chunkText(runOn, 300)
    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(300)
  })

  test('hard-splits at a space, not mid-word', () => {
    const runOn = `${'alpha '.repeat(400)}.`
    for (const chunk of chunkText(runOn, 100)) {
      expect(chunk).not.toMatch(/^\S*?alph[^a]/)
    }
  })

  test('splits a single word longer than maxChars rather than looping forever', () => {
    const chunks = chunkText('x'.repeat(500), 100)
    expect(chunks.length).toBe(5)
    expect(chunks.every((c) => c.length <= 100)).toBe(true)
  })

  test('handles text with no sentence terminators at all', () => {
    const chunks = chunkText('word '.repeat(200).trim(), 100)
    expect(chunks.every((c) => c.length <= 100)).toBe(true)
    expect(chunks.join(' ')).toBe('word '.repeat(200).trim())
  })
})
