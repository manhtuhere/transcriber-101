import { describe, expect, test } from 'vitest'
import { hashText } from './hash'

describe('hashText', () => {
  test('is stable for identical input', () => {
    expect(hashText('the same text')).toBe(hashText('the same text'))
  })

  test('differs for different input', () => {
    expect(hashText('one')).not.toBe(hashText('two'))
  })

  test('is sensitive to a single character change', () => {
    expect(hashText('chapter one')).not.toBe(hashText('chapter onе'))
  })

  test('is sensitive to ordering', () => {
    expect(hashText('a\nb')).not.toBe(hashText('b\na'))
  })

  test('returns a hex string', () => {
    expect(hashText('anything')).toMatch(/^[0-9a-f]+$/)
  })

  test('handles empty input', () => {
    expect(hashText('')).toMatch(/^[0-9a-f]+$/)
  })
})
