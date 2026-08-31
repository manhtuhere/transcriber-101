export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

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
