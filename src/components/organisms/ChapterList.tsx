import type { ManifestChapter } from '../../types/manifest'
import ChapterListItem from '../molecules/ChapterListItem'

interface ChapterListProps {
  chapters: ManifestChapter[]
  activeIdx: number
  onSelect: (idx: number) => void
}

export default function ChapterList({ chapters, activeIdx, onSelect }: ChapterListProps) {
  return (
    <ol className="list-none border-t border-vellum/10 p-0">
      {chapters.map((chapter) => (
        <ChapterListItem
          key={chapter.idx}
          chapter={chapter}
          active={chapter.idx === activeIdx}
          onSelect={onSelect}
        />
      ))}
    </ol>
  )
}
