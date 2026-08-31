import { INPUT_STYLE } from '../atoms/TextInput'

export type SortKey = 'recent' | 'title' | 'length'

interface LibraryToolbarProps {
  query: string
  sort: SortKey
  count: number
  onQueryChange: (query: string) => void
  onSortChange: (sort: SortKey) => void
}

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'recent', label: 'Recently added' },
  { id: 'title', label: 'Title' },
  { id: 'length', label: 'Longest first' },
]

const COMPACT = 'px-3 py-2 text-sm'

export default function LibraryToolbar({
  query,
  sort,
  count,
  onQueryChange,
  onSortChange,
}: LibraryToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-vellum/10 pb-4">
      <h2 className="mr-auto text-2xl font-normal">
        All books{' '}
        <span className="ml-2 align-[0.4em] font-data text-xs text-mute">{count}</span>
      </h2>

      <div className="flex w-full gap-2 sm:w-auto">
        <label className="sr-only" htmlFor="library-search">
          Search your library
        </label>
        <input
          id="library-search"
          type="search"
          placeholder="Search title or author"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className={`${INPUT_STYLE} ${COMPACT} flex-1 sm:w-60 sm:flex-none`}
        />

        <label className="sr-only" htmlFor="library-sort">
          Sort books
        </label>
        <select
          id="library-sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value as SortKey)}
          className={`${INPUT_STYLE} ${COMPACT} w-auto`}
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
