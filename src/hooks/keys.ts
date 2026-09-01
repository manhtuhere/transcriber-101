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
  bookmarks: (bookId: string) => ['bookmarks', bookId] as const,
  cover: (path: string | null | undefined) => ['cover', path] as const,
  /*
    A separate namespace from `cover`, not a longer key under it. The shelf
    signs many paths at once and caches a Record; a single cover caches a
    string. Joining one path yields exactly that path, so sharing the prefix
    made the two collide on a one-book shelf and the detail page rendered
    "[object Object]" as its image source.
  */
  coverBatch: (paths: string[]) => ['cover-batch', paths.join(',')] as const,
}
