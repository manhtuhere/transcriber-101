import { describe, expect, test } from 'vitest'
import { MAX_COVER_BYTES } from '../constants/upload'
import { coverPath, coverRejection } from './cover-file'

const image = (type: string, bytes = 1000) =>
  new File([new Uint8Array(bytes)], 'cover', { type })

describe('coverRejection', () => {
  test('accepts the formats a browser can reliably show', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(coverRejection(image(type)), type).toBeNull()
    }
  })

  test('rejects a format that is not an image', () => {
    expect(coverRejection(image('application/pdf'))).toMatch(/JPEG, PNG or WebP/)
  })

  // Storage would refuse these too; saying so early avoids a slow upload that
  // ends in a failure the reader cannot act on.
  test('rejects an image that is too heavy, and says how heavy it is', () => {
    const rejection = coverRejection(image('image/jpeg', MAX_COVER_BYTES + 1))
    expect(rejection).toMatch(/over the 3 MB limit/)
    expect(rejection).toMatch(/3\.0 MB/)
  })

  test('accepts an image exactly at the limit', () => {
    expect(coverRejection(image('image/jpeg', MAX_COVER_BYTES))).toBeNull()
  })

  test('rejects a file with no type at all', () => {
    expect(coverRejection(image(''))).toMatch(/not supported/)
  })
})

describe('coverPath', () => {
  test('files the cover under its book', () => {
    expect(coverPath('b1', image('image/jpeg'))).toBe('b1/cover.jpg')
  })

  test('keeps the format in the extension', () => {
    expect(coverPath('b1', image('image/png'))).toBe('b1/cover.png')
    expect(coverPath('b1', image('image/webp'))).toBe('b1/cover.webp')
  })

  // One cover per book: replacing it overwrites rather than accumulating.
  test('is stable for a book, so a replacement lands on the old one', () => {
    expect(coverPath('b1', image('image/jpeg'))).toBe(coverPath('b1', image('image/jpeg')))
  })
})
