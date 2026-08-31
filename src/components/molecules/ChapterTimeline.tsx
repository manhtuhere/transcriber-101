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
 * Amber fill is elapsed time. Clicking seeks to that point in the book, across
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
      <div className="group mb-3 flex w-full cursor-pointer gap-0.5">
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
              className={`relative h-[22px] overflow-hidden rounded-[3px] bg-surface-2
                transition-colors group-hover:bg-surface-2/70 ${
                  active ? 'outline outline-offset-1 outline-amber/55' : ''
                }`}
            >
              <span
                style={{ width: `${filled * 100}%` }}
                className={`absolute inset-y-0 left-0 ${
                  active ? 'playhead bg-amber/85' : 'bg-amber/70'
                }`}
              />
            </div>
          )
        })}
      </div>

      <p className="flex justify-between font-data text-xs text-mute">
        <b data-testid="book-position" className="font-medium text-vellum">
          {formatDuration(bookPosition)}
        </b>
        <span data-testid="book-duration">{formatDuration(totalDurationSec)}</span>
      </p>
    </>
  )
}
