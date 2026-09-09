import type { ManifestChapter } from '../../types/manifest'
import ChapterListItem from '../molecules/ChapterListItem'

interface ChapterListProps {
  chapters: ManifestChapter[]
  activeIdx: number
  onSelect: (idx: number) => void
}

export default function ChapterList({ chapters, activeIdx, onSelect }: ChapterListProps) {
  return (
    <section aria-labelledby="chapters-heading" className="space-y-3">
      <h2
        id="chapters-heading"
        className="font-data text-[0.68rem] tracking-[0.14em] text-muted uppercase"
      >
        Chapters
      </h2>
      <ol className="list-none overflow-hidden rounded-md border border-rule bg-card p-0">
        {chapters.map((chapter) => (
          <ChapterListItem
            key={chapter.idx}
            chapter={chapter}
            active={chapter.idx === activeIdx}
            onSelect={onSelect}
          />
        ))}
      </ol>
    </section>
  )
}
