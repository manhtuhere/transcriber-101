import type { ParsedChapter } from '../../types/book'
import Button from '../atoms/Button'
import TextInput from '../atoms/TextInput'

interface ChapterRowProps {
  chapter: ParsedChapter
  onRename: (idx: number, title: string) => void
  onRemove: (idx: number) => void
}

export default function ChapterRow({ chapter, onRename, onRemove }: ChapterRowProps) {
  const position = chapter.idx + 1

  return (
    <tr className="border-b border-vellum/10 hover:bg-surface">
      <td className="px-3 py-2 font-data text-xs text-mute">{position}</td>
      <td className="px-3 py-2">
        <TextInput
          aria-label={`Chapter ${position} title`}
          value={chapter.title}
          onChange={(event) => onRename(chapter.idx, event.target.value)}
          className="max-w-none border-transparent bg-transparent px-2 py-1.5 hover:bg-surface-2 focus:bg-surface-2"
        />
      </td>
      <td data-testid="char-count" className="px-3 py-2 font-data text-xs text-mute">
        {chapter.charCount}
      </td>
      <td className="px-3 py-2 text-right">
        <Button
          variant="ghost"
          aria-label={`Remove chapter ${position}`}
          onClick={() => onRemove(chapter.idx)}
        >
          Remove
        </Button>
      </td>
    </tr>
  )
}
