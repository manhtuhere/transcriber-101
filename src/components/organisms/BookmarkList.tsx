import type { Bookmark } from '../../types/book'
import { formatDuration } from '../../utils/format'

interface BookmarkListProps {
  bookmarks: Bookmark[]
  onSeek: (positionSec: number) => void
  onDelete: (id: string) => void
  deleting?: boolean
}

/**
 * Saved spots, in book time.
 *
 * Presentational: the page owns the data and the seeking, so this renders in a
 * test without a network or an audio element.
 */
export default function BookmarkList({
  bookmarks,
  onSeek,
  onDelete,
  deleting = false,
}: BookmarkListProps) {
  if (bookmarks.length === 0) return null

  return (
    <section aria-labelledby="bookmarks-heading" className="space-y-3">
      <h2
        id="bookmarks-heading"
        className="font-data text-[0.68rem] tracking-[0.14em] text-muted uppercase"
      >
        Saved spots
      </h2>

      <ul className="list-none overflow-hidden rounded-md border border-rule bg-card p-0">
        {bookmarks.map((bookmark) => (
          <li
            key={bookmark.id}
            className="flex items-center gap-3 border-b border-rule last:border-0
              hover:bg-linen/40"
          >
            <button
              type="button"
              onClick={() => onSeek(Number(bookmark.position_sec))}
              aria-label={`Play from ${formatDuration(Number(bookmark.position_sec))}`}
              className="flex flex-1 items-baseline gap-4 px-4 py-3 text-left transition-colors"
            >
              <span className="font-data text-xs text-ochre">
                {formatDuration(Number(bookmark.position_sec))}
              </span>
              <span className="text-sm text-ink/85">{bookmark.note ?? 'Saved spot'}</span>
            </button>

            <button
              type="button"
              onClick={() => onDelete(bookmark.id)}
              disabled={deleting}
              aria-label={`Remove bookmark at ${formatDuration(Number(bookmark.position_sec))}`}
              className="cursor-pointer px-4 py-3 text-sm text-muted transition-colors
                hover:text-oxblood disabled:opacity-40"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
