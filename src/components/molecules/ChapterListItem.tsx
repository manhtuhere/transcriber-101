import type { ManifestChapter } from '../../types/manifest'
import { formatDuration } from '../../utils/format'

interface ChapterListItemProps {
  chapter: ManifestChapter
  active: boolean
  onSelect: (idx: number) => void
}

export default function ChapterListItem({ chapter, active, onSelect }: ChapterListItemProps) {
  return (
    <li>
      <button
        type="button"
        aria-current={active ? 'true' : undefined}
        onClick={() => onSelect(chapter.idx)}
        className={`grid w-full grid-cols-[2.5rem_1fr_auto] items-baseline gap-4 border-b
          border-vellum/10 px-2 py-4 text-left transition-colors hover:bg-surface
          hover:text-vellum sm:grid-cols-[2rem_1fr_auto] ${
            active ? 'text-vellum' : 'text-mute'
          }`}
      >
        {/* The number is data, not a CSS counter: the chapter knows its index. */}
        <span className={`font-data text-xs ${active ? 'text-amber' : 'text-mute/70'}`}>
          {String(chapter.idx + 1).padStart(2, '0')}
        </span>
        <span className="font-title text-lg">{chapter.title}</span>
        <span className="font-data text-xs">{formatDuration(chapter.durationSec)}</span>
      </button>
    </li>
  )
}
