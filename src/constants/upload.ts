/*
  A pre-filter, not the real gate — MAX_BOOK_CHARS below is.

  Its only job is to refuse a file before `file.text()` decodes the whole thing
  into a string, which blocks the tab for seconds on something large. It was
  5 MB, roughly ten times looser than the character cap it guards: every ASCII
  file between 0.5 and 5 MB was read in full only to be rejected on characters
  a moment later.

  2 MB keeps headroom for text that is not one byte per character — 500k
  characters of CJK is about 1.5 MB in UTF-8 — while still refusing anything
  that cannot pass the character cap.
*/
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024

export const ACCEPTED_UPLOAD_TYPES = '.txt,.md,text/plain,text/markdown'

// A delimiter is a line containing nothing but equals signs. The book format
// uses 19, but the count is treated as a floor so a stray extra "=" still
// separates rather than silently merging two chapters.
export const CHAPTER_DELIMITER = /^[ \t]*={19,}[ \t]*$/

// A first line longer than this is prose, not a heading, so it stays in the
// body and the chapter gets a positional name instead.
export const MAX_TITLE_LENGTH = 80

// Cost cap. At Aura-2's $0.030/1k this bounds one book at about $15, which is
// enough for a ~300-page novel and small enough to make a runaway upload
// obvious before it is queued.
export const MAX_BOOK_CHARS = 500_000

/*
  Cover limits. These match the bucket's own limits, which are the real
  enforcement — a request that skips the UI is refused by Storage. Checking
  here as well means the reader is told what is wrong before a slow upload
  starts, rather than after it fails.
*/
export const MAX_COVER_BYTES = 3 * 1024 * 1024
export const ACCEPTED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const ACCEPTED_COVER_ACCEPT = 'image/jpeg,image/png,image/webp'
