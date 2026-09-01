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
    <tr className="border-b border-rule last:border-0 hover:bg-linen/40">
      <td className="py-2 pr-3 pl-4 font-data text-xs text-muted">
        {String(position).padStart(2, '0')}
      </td>
      <td className="py-2 pr-3">
        <TextInput
          aria-label={`Chapter ${position} title`}
          value={chapter.title}
          onChange={(event) => onRename(chapter.idx, event.target.value)}
          className="font-title max-w-none border-transparent bg-transparent px-2 py-1.5
            text-base hover:border-rule hover:bg-card focus:bg-card"
        />
      </td>
      <td data-testid="char-count" className="py-2 pr-3 font-data text-xs text-muted">
        {chapter.charCount.toLocaleString()}
      </td>
      <td className="py-2 pr-4 text-right">
        <Button
          variant="bare"
          aria-label={`Remove chapter ${position}`}
          onClick={() => onRemove(chapter.idx)}
        >
          Remove
        </Button>
      </td>
    </tr>
  )
}
