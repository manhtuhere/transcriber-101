import { describe, expect, test } from 'vitest'
import type { BookSummary } from '../types/book'
import { isFavorite, sortBooks, visibleBooks } from './shelf'

const book = (over: Partial<BookSummary>): BookSummary =>
  ({
    id: 'b',
    title: 'A Book',
    author: 'An Author',
    status: 'ready',
    total_duration_sec: 100,
    created_at: '2026-01-01T00:00:00Z',
    favorited_at: null,
    chapters: [{ count: 1 }],
    ...over,
  }) as BookSummary

const moby = book({ id: '1', title: 'Moby-Dick', author: 'Melville', created_at: '2026-01-03T00:00:00Z' })
const walden = book({ id: '2', title: 'Walden', author: 'Thoreau', created_at: '2026-01-02T00:00:00Z', total_duration_sec: 900 })
const ulysses = book({ id: '3', title: 'Ulysses', author: 'Joyce', created_at: '2026-01-01T00:00:00Z', favorited_at: '2026-02-01T00:00:00Z' })

const shelf = [moby, walden, ulysses]

describe('isFavorite', () => {
  test('a timestamp means favourited', () => {
    expect(isFavorite(ulysses)).toBe(true)
  })

  test('null means not favourited', () => {
    expect(isFavorite(moby)).toBe(false)
  })
})

describe('visibleBooks', () => {
  test('returns everything with no query and no filter', () => {
    expect(visibleBooks(shelf, { query: '', favoritesOnly: false })).toHaveLength(3)
  })

  test('matches on title, case-insensitively', () => {
    const found = visibleBooks(shelf, { query: 'moby', favoritesOnly: false })
    expect(found.map((b) => b.id)).toEqual(['1'])
  })

  test('matches on author too', () => {
    const found = visibleBooks(shelf, { query: 'thoreau', favoritesOnly: false })
    expect(found.map((b) => b.id)).toEqual(['2'])
  })

  test('ignores surrounding whitespace in the query', () => {
    expect(visibleBooks(shelf, { query: '  walden  ', favoritesOnly: false })).toHaveLength(1)
  })

  test('keeps only favourites when asked', () => {
    const found = visibleBooks(shelf, { query: '', favoritesOnly: true })
    expect(found.map((b) => b.id)).toEqual(['3'])
  })

  // Both narrow the shelf; applying one must not discard the other.
  test('applies the search and the favourites filter together', () => {
    expect(visibleBooks(shelf, { query: 'ulysses', favoritesOnly: true })).toHaveLength(1)
    expect(visibleBooks(shelf, { query: 'moby', favoritesOnly: true })).toHaveLength(0)
  })

  test('a book with no author is still searchable by title', () => {
    const anon = book({ id: '4', title: 'Anonymous', author: null })
    expect(visibleBooks([anon], { query: 'anon', favoritesOnly: false })).toHaveLength(1)
  })
})

describe('sortBooks', () => {
  test('recent puts the newest first', () => {
    expect(sortBooks(shelf, 'recent').map((b) => b.id)).toEqual(['1', '2', '3'])
  })

  test('title sorts alphabetically', () => {
    expect(sortBooks(shelf, 'title').map((b) => b.title)).toEqual([
      'Moby-Dick',
      'Ulysses',
      'Walden',
    ])
  })

  test('length puts the longest first', () => {
    expect(sortBooks(shelf, 'length')[0]!.id).toBe('2')
  })

  test('favorites puts favourites first, most recently marked leading', () => {
    const older = book({ id: '5', title: 'Older favourite', favorited_at: '2026-01-01T00:00:00Z' })
    const order = sortBooks([...shelf, older], 'favorites').map((b) => b.id)

    expect(order.slice(0, 2)).toEqual(['3', '5'])
    expect(order.slice(2)).toHaveLength(2)
  })

  test('does not mutate the array it is given', () => {
    const original = [...shelf]
    sortBooks(shelf, 'title')
    expect(shelf).toEqual(original)
  })
})
