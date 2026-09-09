import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import Alert from '../components/atoms/Alert'
import Button from '../components/atoms/Button'
import CoverPicker from '../components/molecules/CoverPicker'
import DropZone from '../components/molecules/DropZone'
import EstimateSummary from '../components/molecules/EstimateSummary'
import BookMetaForm from '../components/organisms/BookMetaForm'
import ChapterTable from '../components/organisms/ChapterTable'
import PageShell from '../components/templates/PageShell'
import {
  ACCEPTED_UPLOAD_TYPES,
  MAX_BOOK_CHARS,
  MAX_UPLOAD_BYTES,
} from '../constants/upload'
import { DEFAULT_VOICE } from '../constants/voices'
import { useCreateBook } from '../hooks/useCreateBook'
import { useUploadCoverFor } from '../hooks/useUploadCover'
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
  const [cover, setCover] = useState<File | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const navigate = useNavigate()

  const queue = useCreateBook()
  const putCover = useUploadCoverFor()

  /*
    The cover is uploaded after the book row exists, never before: its storage
    path is keyed by book id, and there is no id until the insert returns. A
    failed cover is reported but does not block the book — the transcript is
    already queued by then, and sending the reader back to a form that would
    re-queue it would be worse than a book that starts out with its printed
    binding.
  */
  function queueBook() {
    queue.mutate(buildBookDraft({ title, author, voice }, chapters), {
      onSuccess: async (id) => {
        if (cover) {
          try {
            await putCover.mutateAsync({ bookId: id, file: cover })
          } catch {
            // Surfaced on the book's own page, where it can be retried.
          }
        }
        void navigate({ to: '/books/$id', params: { id } })
      },
    })
  }

  async function onSelect(file: File) {
    setChapters([])
    setFileName(null)

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
    setFileName(file.name)
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
    chapters.length > 0 &&
    title.trim() !== '' &&
    author.trim() !== '' &&
    !queue.isPending &&
    !putCover.isPending

  return (
    <PageShell
      title="Add a book"
      lede="Drop in a transcript and it comes back as an audiobook. Chapters are split on a line of 19 equals signs."
    >
      <DropZone
        label="Book file"
        hint={`Drop a .txt or .md transcript here, up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`}
        accept={ACCEPTED_UPLOAD_TYPES}
        chosen={fileName}
        onSelect={onSelect}
      />

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

          <CoverPicker onSelect={setCover} />

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

          <Button disabled={!ready} onClick={queueBook}>
            {queue.isPending || putCover.isPending ? 'Saving…' : 'Save & queue'}
          </Button>
        </div>
      )}
    </PageShell>
  )
}
