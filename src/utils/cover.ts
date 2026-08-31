import { hashText } from './hash'

/*
  Books uploaded here are plain transcripts — there is no cover art and never
  will be. Rather than show a grey placeholder, each book gets a binding colour
  derived from its own title, the way a cloth-bound edition is recognisable
  before you can read the spine.

  Only the hue varies. Saturation and lightness are fixed so a full shelf reads
  as one collection and stays legible against the night background.
*/
export const COVER_SATURATION = 26
export const COVER_LIGHTNESS = 24

export function coverHue(seed: string): number {
  // hashText is FNV-1a, whose low bits avalanche poorly — titles that differ
  // only in their last characters land on neighbouring hues. The murmur3
  // finalizer mixes the whole word down before the modulo, so similar titles
  // get visibly different bindings. Mixing happens here rather than in
  // hashText, which also keys the synthesis cache and must stay stable.
  let h = Number.parseInt(hashText(seed), 16)
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  h ^= h >>> 16
  return (h >>> 0) % 360
}

export function coverStyle(seed: string): { background: string } {
  return {
    background: `hsl(${coverHue(seed)} ${COVER_SATURATION}% ${COVER_LIGHTNESS}%)`,
  }
}
