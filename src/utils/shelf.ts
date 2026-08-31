import type { BookSummary } from '../types/book'

export type SortKey = 'recent' | 'title' | 'length' | 'favorites'

export interface ShelfFilter {
  query: string
  favoritesOnly: boolean
}

/** `favorited_at` doubles as the flag and the record of when it was marked. */
export function isFavorite(book: BookSummary): boolean {
  return book.favorited_at !== null
}

/** Narrow the shelf by search text and the favourites filter, in that order. */
export function visibleBooks(books: BookSummary[], { query, favoritesOnly }: ShelfFilter) {
  const needle = query.trim().toLowerCase()

  return books.filter((book) => {
    if (favoritesOnly && !isFavorite(book)) return false
    if (needle === '') return true
    return `${book.title} ${book.author ?? ''}`.toLowerCase().includes(needle)
  })
}

/** Order the shelf. Returns a new array; the caller's is left alone. */
export function sortBooks(books: BookSummary[], sort: SortKey): BookSummary[] {
  return [...books].sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title)
    if (sort === 'length') return (b.total_duration_sec ?? 0) - (a.total_duration_sec ?? 0)

    if (sort === 'favorites') {
      // Favourites first, most recently marked leading; everything else keeps
      // newest-first behind them.
      if (isFavorite(a) !== isFavorite(b)) return isFavorite(a) ? -1 : 1
      if (isFavorite(a) && isFavorite(b)) {
        return b.favorited_at!.localeCompare(a.favorited_at!)
      }
    }

    return b.created_at.localeCompare(a.created_at)
  })
}
