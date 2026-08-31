import type { Chapter } from '../../types/book'
import ChapterStatusRow from '../molecules/ChapterStatusRow'

interface ChapterProgressTableProps {
  chapters: Chapter[]
  onRetry: (chapterId: string) => void
  retrying: boolean
}

const TH = 'border-b border-vellum/10 px-3 pb-3 text-left text-xs font-medium tracking-[0.1em] text-mute uppercase'

export default function ChapterProgressTable({
  chapters,
  onRetry,
  retrying,
}: ChapterProgressTableProps) {
  const ready = chapters.filter((chapter) => chapter.status === 'ready').length

  return (
    <div className="space-y-6">
      <p className="font-data text-sm tracking-wide text-mute">
        {ready} of {chapters.length} chapters ready
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th scope="col" className={TH}>#</th>
            <th scope="col" className={TH}>Chapter</th>
            <th scope="col" className={TH}>Status</th>
            <th scope="col" className={TH}>Duration</th>
            <th scope="col" className={TH}>Error</th>
            <th scope="col" className={TH} />
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
  )
}
