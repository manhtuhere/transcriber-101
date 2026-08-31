// Deepgram rejects a request over 2000 characters with
// `413 Input Text Exceeds Character Limits`, so the default leaves headroom.
export const MAX_CHUNK_CHARS = 1800

/**
 * Split chapter text into synthesis-sized pieces.
 *
 * Prefers sentence boundaries, falls back to word boundaries, and only ever
 * cuts mid-word for a single "word" longer than the limit — which cannot be
 * spoken as one unit anyway. Whitespace is normalized first so the round-trip
 * invariant (`chunks.join(' ')` reproduces the input) holds.
 */
export function chunkText(text: string, maxChars: number = MAX_CHUNK_CHARS): string[] {
  const normalized = text.trim().replace(/\s+/g, ' ')
  if (normalized === '') return []

  const chunks: string[] = []
  let current = ''

  for (const sentence of splitSentences(normalized)) {
    for (const piece of hardSplit(sentence, maxChars)) {
      if (current === '') {
        current = piece
      } else if (current.length + 1 + piece.length <= maxChars) {
        current = `${current} ${piece}`
      } else {
        chunks.push(current)
        current = piece
      }
    }
  }

  if (current !== '') chunks.push(current)
  return chunks
}

/** Keep the terminator with its sentence. */
function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) ?? [text]
}

/** Break a fragment that is itself over the limit, at spaces where possible. */
function hardSplit(fragment: string, maxChars: number): string[] {
  const trimmed = fragment.trim()
  if (trimmed.length <= maxChars) return [trimmed]

  const pieces: string[] = []
  let rest = trimmed

  while (rest.length > maxChars) {
    const window = rest.slice(0, maxChars + 1)
    const cut = window.lastIndexOf(' ')
    // No space in range: a single token longer than the limit. Cut it rather
    // than loop forever.
    const at = cut > 0 ? cut : maxChars
    pieces.push(rest.slice(0, at).trim())
    rest = rest.slice(at).trim()
  }

  if (rest !== '') pieces.push(rest)
  return pieces
}
