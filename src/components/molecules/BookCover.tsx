import { coverStyle } from '../../utils/cover'

interface BookCoverProps {
  title: string
  chapterCount: number
  /** 0–100. Draws the read-through line along the foot of the cover. */
  percent?: number
  size?: 'sm' | 'lg'
}

/**
 * A generated binding.
 *
 * Transcripts arrive without cover art, so the cover is built from what the
 * book actually is: a colour derived from its title, and one tick per chapter.
 * The ticks are honest — a twelve-chapter book shows twelve — which makes the
 * shelf scannable by shape as well as by colour.
 */
export default function BookCover({
  title,
  chapterCount,
  percent = 0,
  size = 'sm',
}: BookCoverProps) {
  // Past a couple of dozen the ticks stop being countable and become texture.
  const ticks = Math.min(chapterCount, 24)
  const large = size === 'lg'

  return (
    <div
      style={coverStyle(title)}
      aria-hidden="true"
      className={`cover-spine group-hover:cover-spine-raised relative flex aspect-[3/4]
        flex-col justify-end overflow-hidden rounded-[4px_6px_6px_4px] p-3
        transition-transform duration-200 group-hover:-translate-y-1
        motion-reduce:transition-none motion-reduce:group-hover:translate-y-0
        ${large ? 'w-38 shrink-0' : ''}`}
    >
      {/*
        One tick per chapter, ruled down the fore-edge — where a real book shows
        its divisions. Across the head they read as a dashed line; down the edge
        they read as the block of pages, which is what they are.
      */}
      <div className="absolute inset-y-4 right-0 flex flex-col items-end justify-center gap-[3px]">
        {Array.from({ length: ticks }, (_, i) => (
          <span
            key={i}
            className={`h-0.5 rounded-l-[1px] bg-vellum/30 ${large ? 'w-3' : 'w-[9px]'}`}
          />
        ))}
      </div>

      <p
        className={`font-title relative pr-4 leading-[1.15] text-vellum ${
          large ? 'text-lg' : 'text-[0.95rem]'
        }`}
      >
        {title}
      </p>

      {percent > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/35">
          <span className="block h-full bg-amber" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  )
}
