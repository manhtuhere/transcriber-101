// The database enforces these with check constraints, so the generated types
// widen them to `string`. These arrays are the single source the narrowed
// unions in types/book.ts are derived from.
export const BOOK_STATUSES = ['draft', 'processing', 'ready', 'failed'] as const

export const CHAPTER_STATUSES = ['pending', 'synthesizing', 'ready', 'failed'] as const
