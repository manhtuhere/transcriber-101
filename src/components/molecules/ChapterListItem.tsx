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
        className={`grid w-full grid-cols-[2rem_1fr_auto] items-baseline gap-4 border-b
          border-rule px-3 py-3.5 text-left transition-colors last:border-0
          hover:bg-linen/50 ${active ? 'bg-cloth/6' : ''}`}
      >
        {/* The number is data, not a CSS counter: the chapter knows its index. */}
        <span className={`font-data text-xs ${active ? 'text-ochre' : 'text-muted'}`}>
          {String(chapter.idx + 1).padStart(2, '0')}
        </span>
        <span className={`font-title text-base ${active ? 'text-ink' : 'text-ink/85'}`}>
          {chapter.title}
        </span>
        <span className="font-data text-xs text-muted">
          {formatDuration(chapter.durationSec)}
        </span>
      </button>
    </li>
  )
}
