import type { ParsedChapter } from '../../types/book'
import ChapterRow from '../molecules/ChapterRow'

interface ChapterTableProps {
  chapters: ParsedChapter[]
  onRename: (idx: number, title: string) => void
  onRemove: (idx: number) => void
}

const TH = 'border-b border-vellum/10 px-3 pb-3 text-left text-xs font-medium tracking-[0.1em] text-mute uppercase'

export default function ChapterTable({ chapters, onRename, onRemove }: ChapterTableProps) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th scope="col" className={TH}>#</th>
          <th scope="col" className={TH}>Chapter</th>
          <th scope="col" className={TH}>Characters</th>
          <th scope="col" className={TH} />
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
  )
}
