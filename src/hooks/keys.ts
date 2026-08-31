/**
 * Every query key in one place.
 *
 * Keys are the contract between a fetch and the invalidation that refreshes it.
 * Written inline at each call site they drift — one page invalidates `['book']`
 * while another caches under `['books', id]` — and the bug shows up as a stale
 * screen rather than an error.
 */
export const keys = {
  session: ['session'] as const,
  books: ['books'] as const,
  book: (id: string) => ['book', id] as const,
  manifest: (id: string) => ['manifest', id] as const,
  audio: (path: string | undefined) => ['audio', path] as const,
}
