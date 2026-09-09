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
 * the ribbon unreachable by keyboard.
 */
export default function FavoriteButton({ title, favorite, onToggle }: FavoriteButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={favorite}
      aria-label={favorite ? `Remove ${title} from favourites` : `Add ${title} to favourites`}
      onClick={onToggle}
      className={`absolute top-0 right-3 z-10 h-8 w-[18px] cursor-pointer
        drop-shadow-[0_1px_2px_rgb(34_31_26_/_0.35)] transition-[height,filter]
        hover:h-9 motion-reduce:transition-none
        ${favorite ? 'text-ochre' : 'text-card hover:text-linen'}`}
    >
      {/*
        A ribbon marker tucked into the head of the book.

        Filled and outlined rather than tinted: the ribbon sits over an
        uploaded cover, which can be any colour at all. A wash of ink at 25%
        read fine against the generated binding and disappeared completely on
        a dark photograph.
      */}
      <svg viewBox="0 0 18 32" aria-hidden="true" className="h-full w-full fill-current">
        <path
          d="M0 0h18v32l-9-7-9 7z"
          stroke="rgb(34 31 26 / 0.55)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </button>
  )
}
