import { Link } from '@tanstack/react-router'
import type { BookSummary } from '../../types/book'
import { formatDuration, formatRemaining, percentComplete } from '../../utils/format'
import BookCover from '../molecules/BookCover'

interface ContinueListeningProps {
  book: BookSummary
  position: number
  coverUrl?: string
}

/**
 * The page's thesis: you came back to keep listening.
 *
 * Everything here answers one question — how much is left, and where do I press
 * to carry on — so the shelf below it can stay a browsing surface.
 */
export default function ContinueListening({
  book,
  position,
  coverUrl,
}: ContinueListeningProps) {
  const total = book.total_duration_sec ?? 0
  const percent = percentComplete(position, total)
  const chapterCount = book.chapters[0]?.count ?? 0

  return (
    <section
      aria-labelledby="continue-heading"
      className="rounded-md border border-rule bg-card p-6 shadow-[0_1px_2px_rgb(34_31_26_/_0.06)] sm:p-8"
    >
      <p
        id="continue-heading"
        className="font-data text-[0.68rem] tracking-[0.14em] text-ochre uppercase"
      >
        Still reading
      </p>

      <div className="mt-5 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
        <BookCover
          coverUrl={coverUrl}
          title={book.title}
          author={book.author}
          chapterCount={chapterCount}
          durationSec={total}
          size="lg"
        />

        <div className="min-w-0 flex-1">
          <h2 className="text-3xl font-normal">{book.title}</h2>
          <p className="mt-1 text-muted">{book.author}</p>

          <div className="mt-6 max-w-120">
            <div className="h-1.5 overflow-hidden rounded-full bg-linen">
              <span
                className="block h-full rounded-full bg-ochre"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 font-data text-xs text-muted">
              <span className="text-ink">{percent}% through</span>
              <span>{formatRemaining(total - position)}</span>
              <span>
                {formatDuration(position)} of {formatDuration(total)}
              </span>
              <span>{chapterCount} chapters</span>
            </p>
          </div>

          <Link
            to="/books/$id/listen"
            params={{ id: book.id }}
            className="mt-6 inline-flex items-center gap-2 rounded-md border border-cloth
              bg-cloth px-5 py-2.5 text-sm font-medium text-card no-underline
              transition-colors hover:bg-cloth-soft"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
              <path d="M8 5l12 7-12 7z" />
            </svg>
            Continue listening
          </Link>
        </div>
      </div>
    </section>
  )
}
