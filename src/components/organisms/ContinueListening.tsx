import { Link } from '@tanstack/react-router'
import type { BookSummary } from '../../types/book'
import { formatRemaining, percentComplete } from '../../utils/format'
import BookCover from '../molecules/BookCover'

interface ContinueListeningProps {
  book: BookSummary
  position: number
}

/**
 * The page's thesis: you came back to keep listening.
 *
 * Everything here answers one question — how much is left, and where do I press
 * to carry on — so the library below it can stay a browsing surface.
 */
export default function ContinueListening({ book, position }: ContinueListeningProps) {
  const total = book.total_duration_sec ?? 0
  const percent = percentComplete(position, total)
  const chapterCount = book.chapters[0]?.count ?? 0

  return (
    <section
      aria-labelledby="continue-heading"
      className="rounded-2xl border border-vellum/10 bg-surface p-8"
    >
      <p
        id="continue-heading"
        className="font-data text-xs tracking-[0.14em] text-amber uppercase"
      >
        Continue listening
      </p>

      <div className="mt-6 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8">
        <BookCover title={book.title} chapterCount={chapterCount} size="lg" />

        <div className="min-w-0">
          <h2 className="text-3xl font-normal">{book.title}</h2>
          <p className="mt-1 text-mute">{book.author}</p>

          <div className="mt-6 max-w-120">
            <div className="h-[5px] overflow-hidden rounded-[3px] bg-surface-2">
              <span
                className="block h-full rounded-[3px] bg-amber"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 flex gap-3 font-data text-xs text-mute">
              <b className="font-medium text-vellum">{percent}%</b>
              <span>{formatRemaining(total - position)}</span>
            </p>
          </div>

          <Link
            to="/books/$id/listen"
            params={{ id: book.id }}
            className="mt-6 inline-block rounded-full bg-amber px-6 py-3 text-sm font-medium
              tracking-wide text-ink no-underline transition-colors hover:bg-amber/85"
          >
            Continue listening
          </Link>
        </div>
      </div>
    </section>
  )
}
