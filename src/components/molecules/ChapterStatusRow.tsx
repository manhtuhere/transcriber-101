import type { Chapter } from '../../types/book'
import { formatDuration } from '../../utils/format'
import Button from '../atoms/Button'
import StatusBadge from '../atoms/StatusBadge'

interface ChapterStatusRowProps {
  chapter: Chapter
  onRetry: (chapterId: string) => void
  retrying: boolean
}

export default function ChapterStatusRow({
  chapter,
  onRetry,
  retrying,
}: ChapterStatusRowProps) {
  return (
    <tr className="border-b border-vellum/10 hover:bg-surface">
      <td className="px-3 py-2 font-data text-xs text-mute">{chapter.idx + 1}</td>
      <td className="px-3 py-2">{chapter.title}</td>
      <td className="px-3 py-2">
        <StatusBadge status={chapter.status} />
      </td>
      <td className="px-3 py-2 font-data text-xs text-mute">
        {chapter.duration_sec !== null ? formatDuration(chapter.duration_sec) : '—'}
      </td>
      <td className="px-3 py-2 font-data text-xs text-rose">{chapter.error}</td>
      <td className="px-3 py-2 text-right">
        {chapter.status === 'failed' && (
          <Button
            variant="ghost"
            disabled={retrying}
            onClick={() => onRetry(chapter.id)}
            aria-label={`Retry chapter ${chapter.idx + 1}`}
          >
            Retry
          </Button>
        )}
      </td>
    </tr>
  )
}
