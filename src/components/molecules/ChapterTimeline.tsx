import type { ManifestChapter } from '../../types/manifest'
import { formatDuration } from '../../utils/format'

interface ChapterTimelineProps {
  chapters: ManifestChapter[]
  totalDurationSec: number
  bookPosition: number
  activeIdx: number
  onSeek: (bookSeconds: number) => void
}

/**
 * The book's shape, and its scrubber.
 *
 * Each segment is sized in true proportion to its chapter's duration, so the
 * strip reads as the structure of the book — a long chapter is a long segment.
 * Ochre fill is elapsed time. Clicking seeks to that point in the book, across
 * chapter files, which is the thing a native audio element cannot do.
 */
export default function ChapterTimeline({
  chapters,
  totalDurationSec,
  bookPosition,
  activeIdx,
  onSeek,
}: ChapterTimelineProps) {
  function seekFromEvent(event: React.MouseEvent<HTMLElement>, chapter: ManifestChapter) {
    const box = event.currentTarget.getBoundingClientRect()
    const withinChapter = ((event.clientX - box.left) / box.width) * chapter.durationSec
    onSeek(chapter.startOffsetSec + withinChapter)
  }

  return (
    <>
      <div className="group flex w-full cursor-pointer gap-[3px]">
        {chapters.map((chapter) => {
          const elapsed = bookPosition - chapter.startOffsetSec
          const filled = Math.min(Math.max(elapsed / chapter.durationSec, 0), 1)
          const active = chapter.idx === activeIdx

          return (
            <div
              key={chapter.idx}
              style={{ flex: chapter.durationSec }}
              title={`${chapter.title} · ${formatDuration(chapter.durationSec)}`}
              onClick={(event) => seekFromEvent(event, chapter)}
              className={`relative h-3.5 overflow-hidden rounded-[2px] bg-linen
                transition-colors group-hover:bg-rule ${
                  active ? 'ring-1 ring-ochre/60 ring-offset-1 ring-offset-card' : ''
                }`}
            >
              <span
                style={{ width: `${filled * 100}%` }}
                className={`absolute inset-y-0 left-0 ${
                  active ? 'playhead bg-ochre' : 'bg-ochre/55'
                }`}
              />
            </div>
          )
        })}
      </div>

      <p className="mt-2.5 flex justify-between font-data text-xs text-muted">
        <b data-testid="book-position" className="font-medium text-ink">
          {formatDuration(bookPosition)}
        </b>
        <span data-testid="book-duration">{formatDuration(totalDurationSec)}</span>
      </p>
    </>
  )
}
