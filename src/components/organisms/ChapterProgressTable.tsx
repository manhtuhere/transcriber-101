import type { Chapter } from '../../types/book'
import ChapterStatusRow from '../molecules/ChapterStatusRow'

interface ChapterProgressTableProps {
  chapters: Chapter[]
  onRetry: (chapterId: string) => void
  retrying: boolean
}

const TH =
  'py-2.5 pr-3 text-left font-data text-[0.62rem] font-medium tracking-[0.1em] text-muted uppercase'

export default function ChapterProgressTable({
  chapters,
  onRetry,
  retrying,
}: ChapterProgressTableProps) {
  const ready = chapters.filter((chapter) => chapter.status === 'ready').length
  const percent = chapters.length > 0 ? Math.round((ready / chapters.length) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-data text-sm text-muted">
          {ready} of {chapters.length} chapters ready
        </p>
        <div className="h-1.5 min-w-40 flex-1 overflow-hidden rounded-full bg-linen">
          <span
            className="block h-full rounded-full bg-ochre transition-[width] duration-500
              motion-reduce:transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-rule bg-card">
        <table className="w-full border-collapse">
          <thead className="border-b border-rule bg-linen/50">
            <tr>
              <th scope="col" className={`${TH} pl-4`}>#</th>
              <th scope="col" className={TH}>Chapter</th>
              <th scope="col" className={TH}>Status</th>
              <th scope="col" className={TH}>Duration</th>
              <th scope="col" className={TH}>Error</th>
              <th scope="col" className={`${TH} pr-4`} />
            </tr>
          </thead>
          <tbody>
            {chapters.map((chapter) => (
              <ChapterStatusRow
                key={chapter.id}
                chapter={chapter}
                onRetry={onRetry}
                retrying={retrying}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
