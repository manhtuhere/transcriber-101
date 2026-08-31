import type { BOOK_STATUSES, CHAPTER_STATUSES } from '../constants/status'
import type { Tables, TablesInsert } from './database'

export type BookStatus = (typeof BOOK_STATUSES)[number]
export type ChapterStatus = (typeof CHAPTER_STATUSES)[number]

export type Book = Omit<Tables<'books'>, 'status'> & { status: BookStatus }
export type Chapter = Omit<Tables<'chapters'>, 'status'> & { status: ChapterStatus }

export type BookInsert = TablesInsert<'books'>
export type ChapterInsert = TablesInsert<'chapters'>

/** A book row with its chapters, ordered by idx. */
export type BookWithChapters = Book & { chapters: Chapter[] }

/** A book row as the dashboard needs it: counts, not full chapter text. */
export type BookSummary = Book & { chapters: { count: number }[] }

/** One chapter as produced by the splitter, before it reaches the database. */
export interface ParsedChapter {
  idx: number
  title: string
  body: string
  charCount: number
}
