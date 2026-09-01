import { Link } from '@tanstack/react-router'
import type { BookSummary } from '../../types/book'
import { formatLength, formatRemaining, percentComplete } from '../../utils/format'
import FavoriteButton from '../atoms/FavoriteButton'
import StatusBadge from '../atoms/StatusBadge'
import BookCover from './BookCover'

interface BookCardProps {
  book: BookSummary
  /** Saved listening position in seconds, 0 if never opened. */
  position: number
  /** A stored cover, if the book has one. */
  coverUrl?: string
  onToggleFavorite: (bookId: string, favorite: boolean) => void
}

export default function BookCard({
  book,
  position,
  coverUrl,
  onToggleFavorite,
}: BookCardProps) {
  const chapterCount = book.chapters[0]?.count ?? 0
  const ready = book.status === 'ready'
  const total = book.total_duration_sec ?? 0
  const percent = ready ? percentComplete(position, total) : 0
  const started = percent > 0
  const favorite = book.favorited_at !== null

  const action = started ? 'Continue listening' : 'Start listening'

  return (
    <article className="relative">
      {/*
        One link for the whole card: cover, title and action are a single hit
        target and a single tab stop. Two links to the same destination would
        make every card cost two keystrokes to pass.
      */}
      <Link
        to={ready ? '/books/$id/listen' : '/books/$id'}
        params={{ id: book.id }}
        aria-label={ready ? `${action}: ${book.title}` : `View progress: ${book.title}`}
        className="group block rounded-sm text-inherit no-underline"
      >
        <BookCover
          coverUrl={coverUrl}
          title={book.title}
          author={book.author}
          chapterCount={chapterCount}
          durationSec={total}
          percent={percent}
          size="sm"
        />

        <h2 className="font-title mt-3 text-[0.95rem] leading-snug">{book.title}</h2>
        <p className="mt-0.5 text-sm text-muted">{book.author}</p>

        {/*
          Repeated from the cover deliberately. The cover is aria-hidden — it is
          a picture of a book — so without this line the chapter count and
          running time would exist only as pixels.
        */}
        <p className="mt-1 font-data text-[0.68rem] text-muted">
          {chapterCount} chapters
          {total > 0 && <> · {formatLength(total)}</>}
        </p>

        {ready ? (
          <p className="mt-2 flex flex-col gap-0.5">
            <span className="text-sm font-medium text-cloth group-hover:text-cloth-soft">
              {action}
            </span>
            {started && (
              <span className="font-data text-[0.68rem] text-ochre">
                {formatRemaining(total - position)}
              </span>
            )}
          </p>
        ) : (
          <p className="mt-2">
            <StatusBadge status={book.status} />
          </p>
        )}
      </Link>

      <FavoriteButton
        title={book.title}
        favorite={favorite}
        onToggle={() => onToggleFavorite(book.id, !favorite)}
      />
    </article>
  )
}
