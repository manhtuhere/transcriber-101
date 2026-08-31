export const DEEPGRAM_SPEAK_URL = 'https://api.deepgram.com/v1/speak'

// Deepgram's documented hard limit. Over it the API answers
// `413 Input Text Exceeds Character Limits` and produces no audio.
export const MAX_REQUEST_CHARS = 2000

const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_RETRY_DELAY_MS = 500

export interface SynthesizeOptions {
  apiKey: string
  voice: string
  sampleRate?: number
  maxAttempts?: number
  retryDelayMs?: number
}

/** Transient by nature: worth another attempt. */
function isRetryable(status: number): boolean {
  return status === 429 || status >= 500
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms))

/**
 * Synthesize one chunk to PCM WAV.
 *
 * `encoding` and `container` are separate Deepgram parameters — `encoding`
 * defaults to mp3 and `container` to wav, and `encoding=wav` is not a thing.
 * WAV is requested here rather than mp3 so the chunks can be concatenated as
 * PCM and encoded once, which avoids the gaps and VBR-header artifacts that
 * come from stitching mp3 frames together.
 */
export async function synthesizeChunk(
  text: string,
  {
    apiKey,
    voice,
    sampleRate = 24000,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  }: SynthesizeOptions,
): Promise<Buffer> {
  if (text.length >= MAX_REQUEST_CHARS) {
    throw new Error(
      `Chunk of ${text.length} characters is at or over Deepgram's ${MAX_REQUEST_CHARS} ` +
        'character limit. The chunker should have split this.',
    )
  }

  const url = new URL(DEEPGRAM_SPEAK_URL)
  url.searchParams.set('model', voice)
  url.searchParams.set('encoding', 'linear16')
  url.searchParams.set('container', 'wav')
  url.searchParams.set('sample_rate', String(sampleRate))

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Token ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    if (response.ok) {
      return Buffer.from(await response.arrayBuffer())
    }

    if (response.status === 413) {
      throw new Error(
        `Deepgram 413: input exceeds the ${MAX_REQUEST_CHARS} character limit. ` +
          'Retrying cannot help — the chunker is at fault.',
      )
    }

    lastError = new Error(`Deepgram request failed with ${response.status}.`)
    if (!isRetryable(response.status)) throw lastError

    if (attempt < maxAttempts) {
      // Exponential backoff: 1x, 2x, 4x … the base delay.
      await sleep(retryDelayMs * 2 ** (attempt - 1))
    }
  }

  throw lastError ?? new Error('Deepgram request failed.')
}
