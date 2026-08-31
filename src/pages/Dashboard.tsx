import { useMemo, useState } from 'react'
import Alert from '../components/atoms/Alert'
import Spinner from '../components/atoms/Spinner'
import BookGrid from '../components/organisms/BookGrid'
import ContinueListening from '../components/organisms/ContinueListening'
import LibraryToolbar from '../components/organisms/LibraryToolbar'
import PageShell from '../components/templates/PageShell'
import { useBooks } from '../hooks/useBooks'
import { useToggleFavorite } from '../hooks/useToggleFavorite'
import { percentComplete } from '../utils/format'
import { readSavedPosition } from '../utils/playback'
import { isFavorite, sortBooks, visibleBooks, type SortKey } from '../utils/shelf'

/** Far enough in to be worth resuming, not so far it is effectively finished. */
const IN_PROGRESS_MIN = 1
const IN_PROGRESS_MAX = 99

export default function Dashboard() {
  const { data, isPending, error } = useBooks()
  const favorite = useToggleFavorite()

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [favoritesOnly, setFavoritesOnly] = useState(false)

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

  const favoriteCount = books.filter(isFavorite).length
  const visible = useMemo(
    () => sortBooks(visibleBooks(books, { query, favoritesOnly }), sort),
    [books, query, favoritesOnly, sort],
  )

  if (isPending) return <Spinner label="Loading your books…" />

  return (
    <PageShell title="Your library">
      {error && <Alert>{error.message}</Alert>}
      {favorite.error && <Alert>{favorite.error.message}</Alert>}

      {resumable && (
        <ContinueListening book={resumable} position={positions[resumable.id] ?? 0} />
      )}

      {books.length > 0 && (
        <LibraryToolbar
          query={query}
          sort={sort}
          count={books.length}
          favoritesOnly={favoritesOnly}
          favoriteCount={favoriteCount}
          onQueryChange={setQuery}
          onSortChange={setSort}
          onFavoritesOnlyChange={setFavoritesOnly}
        />
      )}

      <BookGrid
        books={visible}
        positions={positions}
        filtered={query.trim() !== '' || favoritesOnly}
        onToggleFavorite={(bookId, next) => favorite.mutate({ bookId, favorite: next })}
      />
    </PageShell>
  )
}
