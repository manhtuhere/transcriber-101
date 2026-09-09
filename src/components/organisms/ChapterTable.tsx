import type { ParsedChapter } from '../../types/book'
import ChapterRow from '../molecules/ChapterRow'

interface ChapterTableProps {
  chapters: ParsedChapter[]
  onRename: (idx: number, title: string) => void
  onRemove: (idx: number) => void
}

const TH =
  'py-2.5 pr-3 text-left font-data text-[0.62rem] font-medium tracking-[0.1em] text-muted uppercase'

export default function ChapterTable({ chapters, onRename, onRemove }: ChapterTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-rule bg-card">
      <table className="w-full border-collapse">
        <thead className="border-b border-rule bg-linen/50">
          <tr>
            <th scope="col" className={`${TH} pl-4`}>#</th>
            <th scope="col" className={TH}>Chapter</th>
            <th scope="col" className={TH}>Characters</th>
            <th scope="col" className={`${TH} pr-4`} />
          </tr>
        </thead>
        <tbody>
          {chapters.map((chapter) => (
            <ChapterRow
              key={chapter.idx}
              chapter={chapter}
              onRename={onRename}
              onRemove={onRemove}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
