import { Link } from '@tanstack/react-router'
import type { BookSummary } from '../../types/book'
import { formatLength, formatRemaining, percentComplete } from '../../utils/format'
import StatusBadge from '../atoms/StatusBadge'
import BookCover from './BookCover'

interface BookCardProps {
  book: BookSummary
  /** Saved listening position in seconds, 0 if never opened. */
  position: number
}

export default function BookCard({ book, position }: BookCardProps) {
  const chapterCount = book.chapters[0]?.count ?? 0
  const ready = book.status === 'ready'
  const total = book.total_duration_sec ?? 0
  const percent = ready ? percentComplete(position, total) : 0
  const started = percent > 0

  const action = started ? 'Continue listening' : 'Start listening'

  return (
    <article>
      {/*
        One link for the whole card: cover, title and action are a single hit
        target and a single tab stop. Two links to the same destination would
        make every card cost two keystrokes to pass.
      */}
      <Link
        to={ready ? '/books/$id/listen' : '/books/$id'}
        params={{ id: book.id }}
        aria-label={ready ? `${action}: ${book.title}` : `View progress: ${book.title}`}
        className="group block rounded-md text-inherit no-underline"
      >
        <BookCover title={book.title} chapterCount={chapterCount} percent={percent} size="sm" />

        <h2 className="mt-3 text-base leading-tight font-medium">{book.title}</h2>
        <p className="mt-1 text-sm text-mute">{book.author}</p>

        <p className="mt-1 flex gap-3 font-data text-xs text-mute">
          <span>{chapterCount} chapters</span>
          {book.total_duration_sec !== null && (
            <span>{formatLength(book.total_duration_sec)}</span>
          )}
        </p>

        {ready ? (
          <p className="mt-2 flex flex-col gap-1 text-sm text-amber transition-colors group-hover:text-amber/80">
            {action}
            {started && (
              <span className="font-data text-xs text-mute">
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
    </article>
  )
}
