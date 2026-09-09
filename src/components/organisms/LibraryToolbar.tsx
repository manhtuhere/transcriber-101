import { INPUT_STYLE } from '../atoms/TextInput'
import type { SortKey } from '../../utils/shelf'

interface LibraryToolbarProps {
  query: string
  sort: SortKey
  count: number
  favoritesOnly: boolean
  favoriteCount: number
  onQueryChange: (query: string) => void
  onSortChange: (sort: SortKey) => void
  onFavoritesOnlyChange: (only: boolean) => void
}

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'recent', label: 'Recently added' },
  { id: 'title', label: 'Title' },
  { id: 'length', label: 'Longest first' },
  { id: 'favorites', label: 'Favourites first' },
]

const COMPACT = 'px-3 py-2 text-sm'

export default function LibraryToolbar({
  query,
  sort,
  count,
  favoritesOnly,
  favoriteCount,
  onQueryChange,
  onSortChange,
  onFavoritesOnlyChange,
}: LibraryToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-rule pb-4">
      <h2 className="text-xl font-normal">
        All books <span className="ml-1 font-data text-xs text-muted">{count}</span>
      </h2>

      {favoriteCount > 0 && (
        <button
          type="button"
          aria-pressed={favoritesOnly}
          onClick={() => onFavoritesOnlyChange(!favoritesOnly)}
          className={`mr-auto flex cursor-pointer items-center gap-1.5 rounded-full border
            px-3 py-1.5 text-sm transition-colors ${
              favoritesOnly
                ? 'border-ochre bg-ochre/12 text-ink'
                : 'border-edge bg-card text-muted hover:border-ink/40 hover:text-ink'
            }`}
        >
          <svg viewBox="0 0 12 8" aria-hidden="true" className="w-2.5 fill-ochre">
            <path d="M0 0h12L6 8z" />
          </svg>
          Favourites
          <span className="font-data text-xs">{favoriteCount}</span>
        </button>
      )}
      {favoriteCount === 0 && <div className="mr-auto" />}

      {/*
        Stacked on a narrow screen. Side by side, the select holds its natural
        width for "Recently added" and squeezes the search box down to a square;
        a select will not shrink below its content however the flex basis is set.
      */}
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <label className="sr-only" htmlFor="library-search">
          Search your library
        </label>
        <input
          id="library-search"
          type="search"
          placeholder="Search title or author"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className={`${INPUT_STYLE} ${COMPACT} w-full sm:w-56`}
        />

        <label className="sr-only" htmlFor="library-sort">
          Sort books
        </label>
        <select
          id="library-sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortKey)}
          className={`${INPUT_STYLE} ${COMPACT} w-full sm:w-auto`}
        >
          {SORTS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
