import { coverStyle } from '../../utils/cover'
import { formatLength } from '../../utils/format'

interface BookCoverProps {
  title: string
  author?: string | null
  chapterCount: number
  /** Total length in seconds, printed on the foot band. 0 prints a placeholder. */
  durationSec?: number
  /** 0–100. Draws the read-through line along the foot of the cover. */
  percent?: number
  size?: 'sm' | 'lg'
}

/**
 * A generated binding, in the banded style of a Pelican paperback.
 *
 * Transcripts arrive without cover art and never will have any, so the cover is
 * printed from what the book actually is: a cloth colour hashed from its title,
 * the chapter count on the head band, the running time on the foot. The bands
 * carry real information — they are a catalogue entry, not ornament — which is
 * what makes a shelf of these scannable rather than merely colourful.
 */
export default function BookCover({
  title,
  author,
  chapterCount,
  durationSec = 0,
  percent = 0,
  size = 'sm',
}: BookCoverProps) {
  const large = size === 'lg'
  const band = `flex items-center justify-between gap-2 px-2.5 font-data uppercase
    tracking-[0.1em] text-card/85 ${large ? 'py-2 text-[0.62rem]' : 'py-1.5 text-[0.52rem]'}`

  return (
    <div
      aria-hidden="true"
      className={`book-block group-hover:book-block-raised relative flex aspect-[5/7]
        flex-col overflow-hidden rounded-[2px_5px_5px_2px] bg-card
        transition-transform duration-200 group-hover:-translate-y-[3px]
        motion-reduce:transition-none motion-reduce:group-hover:translate-y-0
        ${large ? 'w-40 shrink-0' : ''}`}
    >
      {/*
        The bands carry only what the caption beneath the cover does not. At
        shelf size that is the chapter count alone: printing the author and the
        running time here as well put them in the page twice, once as a picture
        and once as text.
      */}
      <div style={coverStyle(title)} className={band}>
        <span>{chapterCount} ch</span>
        {large && durationSec > 0 && <span>{formatLength(durationSec)}</span>}
      </div>

      {/*
        The title sits high in the panel rather than dead centre, as it does on
        a real banded paperback — centred, a short title floats in the middle of
        an empty field and the cover reads as unfinished.
      */}
      <div className="flex flex-1 flex-col gap-1.5 px-2.5 pt-5 pb-2 text-center">
        <p className={`font-title leading-[1.2] ${large ? 'text-[1.05rem]' : 'text-[0.82rem]'}`}>
          {title}
        </p>
        {large && author && (
          <p className="font-data text-[0.6rem] tracking-[0.06em] text-muted uppercase">
            {author}
          </p>
        )}

        {/* A printer's rule, to sit the title on something. */}
        <span aria-hidden="true" className="mx-auto mt-1 h-px w-8 bg-rule" />
      </div>

      <div style={coverStyle(title)} className={`${band} justify-center`}>
        Transcriber
      </div>

      {percent > 0 && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-ink/20">
          <span className="block h-full bg-ochre" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  )
}
