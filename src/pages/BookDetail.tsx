import { Link, useParams } from '@tanstack/react-router'
import Alert from '../components/atoms/Alert'
import Spinner from '../components/atoms/Spinner'
import ChapterProgressTable from '../components/organisms/ChapterProgressTable'
import PageShell from '../components/templates/PageShell'
import { useBook } from '../hooks/useBook'
import { useChapterUpdates } from '../hooks/useChapterUpdates'
import { useRetryChapter } from '../hooks/useRetryChapter'

export default function BookDetail() {
  // strict: false rather than a `from` route id — the page reads the param
  // of whatever route matched, so it stays renderable on its own in tests
  // instead of only inside the app's full tree.
  const { id = '' } = useParams({ strict: false })

  const { data: book, isPending, error } = useBook(id)
  const retry = useRetryChapter(id)
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
      <p className="text-mute !mt-3">{book.author}</p>

      {book.status === 'failed' && (
        <Alert>Some chapters failed to synthesize. Retry them below.</Alert>
      )}
      {retry.error && <Alert>{retry.error.message}</Alert>}
      {book.status === 'ready' && (
        <p>
          <Link
            to="/books/$id/listen"
            params={{ id: book.id }}
            className="border-b border-current text-amber no-underline"
          >
            Listen
          </Link>
        </p>
      )}

      <ChapterProgressTable
        chapters={book.chapters}
        onRetry={(chapterId) => retry.mutate(chapterId)}
        retrying={retry.isPending}
      />
    </PageShell>
  )
}
