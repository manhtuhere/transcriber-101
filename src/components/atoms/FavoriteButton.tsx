interface FavoriteButtonProps {
  title: string
  favorite: boolean
  onToggle: () => void
}

/**
 * The bookmark ribbon on a cover.
 *
 * A button, not a link, and a sibling of the card's link rather than a child:
 * nesting interactive content inside an anchor is invalid, and it would make
 * the star unreachable by keyboard.
 */
export default function FavoriteButton({ title, favorite, onToggle }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={favorite ? `Remove ${title} from favourites` : `Add ${title} to favourites`}
      onClick={onToggle}
      className={`absolute top-2 right-2 grid size-8 cursor-pointer place-items-center
        rounded-full backdrop-blur-sm transition-colors
        ${favorite ? 'bg-night/60 text-amber' : 'bg-night/40 text-vellum/60 hover:text-vellum'}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
        <path
          d="M7 3h10a1 1 0 0 1 1 1v17l-6-4-6 4V4a1 1 0 0 1 1-1z"
          fill={favorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
