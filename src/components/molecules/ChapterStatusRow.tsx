import type { Chapter } from '../../types/book'
import { formatDuration } from '../../utils/format'
import Button from '../atoms/Button'
import StatusBadge from '../atoms/StatusBadge'

interface ChapterStatusRowProps {
  chapter: Chapter
  onRetry: (chapterId: string) => void
  retrying: boolean
}

export default function ChapterStatusRow({ chapter, onRetry, retrying }: ChapterStatusRowProps) {
  return (
    <tr className="border-b border-rule last:border-0 hover:bg-linen/40">
      <td className="py-3 pr-3 pl-4 font-data text-xs text-muted">
        {String(chapter.idx + 1).padStart(2, '0')}
      </td>
      <td className="font-title py-3 pr-3">{chapter.title}</td>
      <td className="py-3 pr-3">
        <StatusBadge status={chapter.status} />
      </td>
      <td className="py-3 pr-3 font-data text-xs text-muted">
        {chapter.duration_sec !== null ? formatDuration(chapter.duration_sec) : '—'}
      </td>
      <td className="py-3 pr-3 font-data text-xs text-oxblood">{chapter.error}</td>
      <td className="py-3 pr-4 text-right">
        {chapter.status === 'failed' && (
          <Button
            variant="ghost"
            disabled={retrying}
            onClick={() => onRetry(chapter.id)}
            aria-label={`Retry chapter ${chapter.idx + 1}`}
            className="px-3 py-1.5"
          >
            Retry
          </Button>
        )}
      </td>
    </tr>
  )
}
