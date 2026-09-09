import { describe, expect, test } from 'vitest'
import { COVER_LIGHTNESS, COVER_SATURATION, coverHue, coverStyle } from './cover'

describe('coverHue', () => {
  test('is stable for the same book', () => {
    expect(coverHue('Moby-Dick')).toBe(coverHue('Moby-Dick'))
  })

  test('differs between books', () => {
    expect(coverHue('Moby-Dick')).not.toBe(coverHue('Ulysses'))
  })

  test('is always a valid hue', () => {
    for (const title of ['a', 'Moby-Dick', 'Ulysses', '', 'x'.repeat(200)]) {
      const hue = coverHue(title)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
      expect(Number.isInteger(hue)).toBe(true)
    }
  })

  test('spreads titles across the wheel rather than clustering', () => {
    const titles = Array.from({ length: 24 }, (_, i) => `Book number ${i}`)
    const buckets = new Set(titles.map((t) => Math.floor(coverHue(t) / 60)))
    // Six 60° buckets; a decent hash should reach most of them.
    expect(buckets.size).toBeGreaterThanOrEqual(4)
  })
})

describe('coverStyle', () => {
  // Bindings vary in hue only. Saturation and lightness stay fixed so a shelf
  // of books reads as one collection instead of a bag of sweets.
  test('holds saturation and lightness constant across books', () => {
    for (const title of ['Moby-Dick', 'Ulysses', 'Middlemarch']) {
      expect(coverStyle(title).background).toContain(`${COVER_SATURATION}%`)
      expect(coverStyle(title).background).toContain(`${COVER_LIGHTNESS}%`)
    }
  })

  test('returns a CSS colour for the binding', () => {
    expect(coverStyle('Moby-Dick').background).toMatch(/^hsl\(\d+ \d+% \d+%\)$/)
  })

  test('is stable for the same title', () => {
    expect(coverStyle('Moby-Dick')).toEqual(coverStyle('Moby-Dick'))
  })
})
