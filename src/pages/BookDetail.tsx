import { Link, useParams } from '@tanstack/react-router'
import Alert from '../components/atoms/Alert'
import Spinner from '../components/atoms/Spinner'
import BookIdentity from '../components/organisms/BookIdentity'
import ChapterProgressTable from '../components/organisms/ChapterProgressTable'
import DangerZone from '../components/organisms/DangerZone'
import PageShell from '../components/templates/PageShell'
import { useBook } from '../hooks/useBook'
import { useChapterUpdates } from '../hooks/useChapterUpdates'
import { useCoverUrl } from '../hooks/useCoverUrl'
import { useDeleteBook } from '../hooks/useDeleteBook'
import { useRetryChapter } from '../hooks/useRetryChapter'
import { useUpdateBook } from '../hooks/useUpdateBook'
import { useRemoveCover, useUploadCover } from '../hooks/useUploadCover'

export default function BookDetail() {
  // strict: false rather than a `from` route id — the page reads the param
  // of whatever route matched, so it stays renderable on its own in tests
  // instead of only inside the app's full tree.
  const { id = '' } = useParams({ strict: false })

  const { data: book, isPending, error } = useBook(id)
  const retry = useRetryChapter(id)
  const remove = useDeleteBook()
  const rename = useUpdateBook(id)
  const putCover = useUploadCover(id)
  const dropCover = useRemoveCover(id)
  const cover = useCoverUrl(book?.cover_path ?? null)
  useChapterUpdates(id)

  if (isPending) return <Spinner label="Loading the book…" />
  if (error) {
    return (
      <PageShell title="Book">
        <Alert>{error.message}</Alert>
      </PageShell>
    )
  }

  return (
    <PageShell title={book.title}>
      <BookIdentity
        title={book.title}
        author={book.author}
        chapterCount={book.chapters.length}
        durationSec={book.total_duration_sec ?? 0}
        coverUrl={cover.data}
        hasCover={book.cover_path !== null}
        onSave={(fields) => rename.mutate(fields)}
        onCoverSelect={(file) => putCover.mutate(file)}
        onCoverRemove={() => book.cover_path && dropCover.mutate(book.cover_path)}
        saving={rename.isPending}
        coverBusy={putCover.isPending || dropCover.isPending}
        error={rename.error ?? putCover.error ?? dropCover.error}
      >
        {book.status === 'ready' && (
          <p>
            <Link
              to="/books/$id/listen"
              params={{ id: book.id }}
              className="inline-flex items-center gap-2 rounded-md border border-cloth bg-cloth
                px-5 py-2.5 text-sm font-medium text-card no-underline transition-colors
                hover:bg-cloth-soft"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
                <path d="M8 5l12 7-12 7z" />
              </svg>
              Listen
            </Link>
          </p>
        )}
      </BookIdentity>

      {book.status === 'failed' && (
        <Alert>Some chapters failed to synthesize. Retry them below.</Alert>
      )}
      {retry.error && <Alert>{retry.error.message}</Alert>}

      <ChapterProgressTable
        chapters={book.chapters}
        onRetry={(chapterId) => retry.mutate(chapterId)}
        retrying={retry.isPending}
      />

      <DangerZone
        title={book.title}
        onDelete={() => remove.mutate(book.id)}
        deleting={remove.isPending}
        error={remove.error}
      />
    </PageShell>
  )
}
