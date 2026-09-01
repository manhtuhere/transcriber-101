import { Link } from '@tanstack/react-router'
import type { BookSummary } from '../../types/book'
import BookCard from '../molecules/BookCard'

interface BookGridProps {
  books: BookSummary[]
  /** Saved position per book id, in seconds. */
  positions: Record<string, number>
  /** True when books exist but the search or filter hid them all. */
  filtered?: boolean
  onToggleFavorite: (bookId: string, favorite: boolean) => void
}

export default function BookGrid({
  books,
  positions,
  filtered = false,
  onToggleFavorite,
}: BookGridProps) {
  if (books.length === 0) {
    return filtered ? (
      <p className="py-10 text-center text-muted">
        Nothing here matches. Try a different search, or clear the favourites filter.
      </p>
    ) : (
      <div className="rounded-md border border-dashed border-rule bg-card/60 px-6 py-14 text-center">
        <p className="font-title mx-auto max-w-[36ch] text-xl">
          Your shelf is empty. Upload a transcript and it comes back as something you can
          listen to.
        </p>
        <p className="mx-auto mt-3 max-w-[42ch] text-sm text-muted">
          Any <code className="font-data text-ink">.txt</code> file works, with chapters
          separated by a line of 19 equals signs.
        </p>
        <Link
          to="/upload"
          className="mt-6 inline-block rounded-md border border-cloth bg-cloth px-5 py-2.5
            text-sm font-medium text-card no-underline transition-colors hover:bg-cloth-soft"
        >
          Add your first book
        </Link>
      </div>
    )
  }

  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-5 gap-y-9
        sm:grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] sm:gap-x-7 sm:gap-y-11"
    >
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          position={positions[book.id] ?? 0}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  )
}
