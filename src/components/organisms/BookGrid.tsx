import { Link } from '@tanstack/react-router'
import type { BookSummary } from '../../types/book'
import BookCard from '../molecules/BookCard'

interface BookGridProps {
  books: BookSummary[]
  /** Saved position per book id, in seconds. */
  positions: Record<string, number>
  /** True when books exist but the search hid them all. */
  filtered?: boolean
}

export default function BookGrid({ books, positions, filtered = false }: BookGridProps) {
  if (books.length === 0) {
    return filtered ? (
      <p className="text-mute">No books match that search.</p>
    ) : (
      <div className="max-w-[38ch] border-y border-vellum/10 py-12 text-lg text-mute">
        <p>No books yet. Upload a transcript and it becomes something you can listen to.</p>
        <Link
          to="/upload"
          className="mt-6 inline-block border-b border-current text-base text-amber no-underline"
        >
          Add your first book
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-x-6 sm:gap-y-8">
      {books.map((book) => (
        <BookCard key={book.id} book={book} position={positions[book.id] ?? 0} />
      ))}
    </div>
  )
}
