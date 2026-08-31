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
    <section aria-labelledby="bookmarks-heading" className="mt-12">
      <h2 id="bookmarks-heading" className="font-data text-xs tracking-[0.14em] text-amber uppercase">
        Bookmarks
      </h2>

      <ul className="mt-4 list-none border-t border-vellum/10 p-0">
        {bookmarks.map((bookmark) => (
          <li key={bookmark.id} className="flex items-center gap-4 border-b border-vellum/10">
            <button
              type="button"
              onClick={() => onSeek(Number(bookmark.position_sec))}
              aria-label={`Play from ${formatDuration(Number(bookmark.position_sec))}`}
              className="flex flex-1 items-baseline gap-4 py-3 text-left text-mute
                transition-colors hover:text-vellum"
            >
              <span className="font-data text-xs text-amber">
                {formatDuration(Number(bookmark.position_sec))}
              </span>
              <span>{bookmark.note ?? 'Saved spot'}</span>
            </button>

            <button
              type="button"
              onClick={() => onDelete(bookmark.id)}
              disabled={deleting}
              aria-label={`Remove bookmark at ${formatDuration(Number(bookmark.position_sec))}`}
              className="cursor-pointer px-2 py-3 text-sm text-mute transition-colors
                hover:text-rose disabled:opacity-40"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
