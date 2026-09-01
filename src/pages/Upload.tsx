import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import Alert from '../components/atoms/Alert'
import Button from '../components/atoms/Button'
import EstimateSummary from '../components/molecules/EstimateSummary'
import FilePicker from '../components/molecules/FilePicker'
import BookMetaForm from '../components/organisms/BookMetaForm'
import ChapterTable from '../components/organisms/ChapterTable'
import PageShell from '../components/templates/PageShell'
import { MAX_BOOK_CHARS, MAX_UPLOAD_BYTES } from '../constants/upload'
import { DEFAULT_VOICE } from '../constants/voices'
import { useCreateBook } from '../hooks/useCreateBook'
import type { ParsedChapter } from '../types/book'
import { buildBookDraft } from '../utils/buildInsert'
import { estimateCost, estimateRuntime } from '../utils/estimate'
import { splitChapters } from '../utils/splitChapters'

function isTextFile(file: File): boolean {
  return /\.(txt|md)$/i.test(file.name) && !/^application\//.test(file.type)
}

export default function Upload() {
  const [chapters, setChapters] = useState<ParsedChapter[]>([])
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [voice, setVoice] = useState<string>(DEFAULT_VOICE)
  const navigate = useNavigate()

  const queue = useCreateBook()

  async function onSelect(file: File) {
    setChapters([])

    if (!isTextFile(file)) {
      setError('That file type is not supported. Upload a .txt or .md file.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`That file is too large. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`)
      return
    }

    const parsed = splitChapters(await file.text())
    const chars = parsed.reduce((sum, chapter) => sum + chapter.charCount, 0)

    // Checked before anything is written, so a runaway upload cannot be queued
    // and billed by accident.
    if (chars > MAX_BOOK_CHARS) {
      setError(
        `That book is ${chars.toLocaleString()} characters, over the ` +
          `${MAX_BOOK_CHARS.toLocaleString()} limit. Split it into volumes first.`,
      )
      return
    }

    setError(null)
    setChapters(parsed)
  }

  function renameChapter(idx: number, value: string) {
    setChapters((current) =>
      current.map((chapter) => (chapter.idx === idx ? { ...chapter, title: value } : chapter)),
    )
  }

  // idx is positional, so removing a chapter has to renumber the rest — the
  // worker and the manifest both rely on it being contiguous from 0.
  function removeChapter(idx: number) {
    setChapters((current) =>
      current
        .filter((chapter) => chapter.idx !== idx)
        .map((chapter, i) => ({ ...chapter, idx: i })),
    )
  }

  const totalChars = chapters.reduce((sum, chapter) => sum + chapter.charCount, 0)
  const { usd } = estimateCost(totalChars, voice)
  const { seconds } = estimateRuntime(totalChars)
  const ready =
    chapters.length > 0 && title.trim() !== '' && author.trim() !== '' && !queue.isPending

  return (
    <PageShell
      title="Add a book"
      lede="Drop in a transcript and it comes back as an audiobook. Chapters are split on a line of 19 equals signs."
    >
      <FilePicker label="Book file" onSelect={onSelect} />

      {error && <Alert>{error}</Alert>}
      {queue.error && <Alert>{queue.error.message}</Alert>}
      {chapters.length === 0 && !error && (
        <p className="rounded-md border border-dashed border-rule bg-card/60 px-5 py-8
          text-center text-muted">
          Choose a file and its chapters will be listed here for checking, with what the
          conversion will cost, before anything is saved.
        </p>
      )}

      {chapters.length > 0 && (
        <div className="space-y-6">
          <BookMetaForm
            title={title}
            author={author}
            voice={voice}
            onTitleChange={setTitle}
            onAuthorChange={setAuthor}
            onVoiceChange={setVoice}
          />

          <ChapterTable
            chapters={chapters}
            onRename={renameChapter}
            onRemove={removeChapter}
          />

          <EstimateSummary
            chapterCount={chapters.length}
            totalChars={totalChars}
            usd={usd}
            seconds={seconds}
          />

          <Button
            disabled={!ready}
            onClick={() =>
              queue.mutate(buildBookDraft({ title, author, voice }, chapters), {
                onSuccess: (id) => void navigate({ to: '/books/$id', params: { id } }),
              })
            }
          >
            {queue.isPending ? 'Saving…' : 'Save & queue'}
          </Button>
        </div>
      )}
    </PageShell>
  )
}
