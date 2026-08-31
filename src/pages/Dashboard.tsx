import { useMemo, useState } from 'react'
import Alert from '../components/atoms/Alert'
import Spinner from '../components/atoms/Spinner'
import BookGrid from '../components/organisms/BookGrid'
import ContinueListening from '../components/organisms/ContinueListening'
import LibraryToolbar, { type SortKey } from '../components/organisms/LibraryToolbar'
import PageShell from '../components/templates/PageShell'
import { useBooks } from '../hooks/useBooks'
import type { BookSummary } from '../types/book'
import { percentComplete } from '../utils/format'
import { readSavedPosition } from '../utils/playback'

/** Far enough in to be worth resuming, not so far it is effectively finished. */
const IN_PROGRESS_MIN = 1
const IN_PROGRESS_MAX = 99

export default function Dashboard() {
  const { data, isPending, error } = useBooks()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')

  const books = useMemo(() => data ?? [], [data])

  // Positions live in this browser's localStorage, not the database, so they
  // are read once per render pass rather than fetched.
  const positions = useMemo(
    () => Object.fromEntries(books.map((book) => [book.id, readSavedPosition(book.id)])),
    [books],
  )

  const resumable = books.find((book) => {
    if (book.status !== 'ready') return false
    const percent = percentComplete(positions[book.id] ?? 0, book.total_duration_sec ?? 0)
    return percent >= IN_PROGRESS_MIN && percent <= IN_PROGRESS_MAX
  })

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matched = needle
      ? books.filter((book) =>
          `${book.title} ${book.author ?? ''}`.toLowerCase().includes(needle),
        )
      : books

    return [...matched].sort(comparator(sort))
  }, [books, query, sort])

  if (isPending) return <Spinner label="Loading your books…" />

  return (
    <PageShell title="Your library">
      {error && <Alert>{error.message}</Alert>}

      {resumable && (
        <ContinueListening book={resumable} position={positions[resumable.id] ?? 0} />
      )}

      {books.length > 0 && (
        <LibraryToolbar
          query={query}
          sort={sort}
          count={books.length}
          onQueryChange={setQuery}
          onSortChange={setSort}
        />
      )}

      <BookGrid books={visible} positions={positions} filtered={query.trim() !== ''} />
    </PageShell>
  )
}

function comparator(sort: SortKey) {
  return (a: BookSummary, b: BookSummary) => {
    if (sort === 'title') return a.title.localeCompare(b.title)
    if (sort === 'length') return (b.total_duration_sec ?? 0) - (a.total_duration_sec ?? 0)
    return b.created_at.localeCompare(a.created_at)
  }
}
