import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { chunkText } from './chunkText'
import { DEEPGRAM_SPEAK_URL, MAX_REQUEST_CHARS, synthesizeChunk } from './deepgram'

const AUDIO = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0])

let requests: Request[] = []
const server = setupServer()

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  requests = []
})
afterAll(() => server.close())

function respond(...statuses: (number | 'ok')[]) {
  let call = 0
  server.use(
    http.post(DEEPGRAM_SPEAK_URL, async ({ request }) => {
      requests.push(request.clone())
      const outcome = statuses[Math.min(call, statuses.length - 1)]
      call += 1
      if (outcome === 'ok') return HttpResponse.arrayBuffer(AUDIO.buffer as ArrayBuffer)
      return new HttpResponse(null, { status: outcome as number })
    }),
  )
}

const opts = { apiKey: 'test-key', voice: 'aura-2-thalia-en', retryDelayMs: 0 }

describe('synthesizeChunk', () => {
  test('posts the chunk text as JSON to /v1/speak', async () => {
    respond('ok')
    await synthesizeChunk('Hello there.', opts)

    expect(await requests[0]!.json()).toEqual({ text: 'Hello there.' })
  })

  test('sends the Authorization: Token header', async () => {
    respond('ok')
    await synthesizeChunk('Hello.', opts)

    expect(requests[0]!.headers.get('authorization')).toBe('Token test-key')
  })

  test('sends the full model id including the language suffix', async () => {
    respond('ok')
    await synthesizeChunk('Hello.', opts)

    expect(new URL(requests[0]!.url).searchParams.get('model')).toBe('aura-2-thalia-en')
  })

  // Guards the encoding=wav mistake: Deepgram's `encoding` and `container` are
  // separate parameters. `encoding` defaults to mp3, `container` to wav, and
  // there is no `encoding=wav`. PCM wav is linear16 in a wav container.
  test('requests linear16 in a wav container at 24000 Hz', async () => {
    respond('ok')
    await synthesizeChunk('Hello.', opts)

    const params = new URL(requests[0]!.url).searchParams
    expect(params.get('encoding')).toBe('linear16')
    expect(params.get('container')).toBe('wav')
    expect(params.get('sample_rate')).toBe('24000')
  })

  test('returns the audio buffer on 200', async () => {
    respond('ok')
    const audio = await synthesizeChunk('Hello.', opts)

    expect(Buffer.isBuffer(audio)).toBe(true)
    expect(audio.length).toBe(AUDIO.length)
  })

  test('retries on 429 and succeeds on the second attempt', async () => {
    respond(429, 'ok')
    await synthesizeChunk('Hello.', opts)

    expect(requests).toHaveLength(2)
  })

  test('retries on 500 and succeeds on a later attempt', async () => {
    respond(500, 500, 'ok')
    await synthesizeChunk('Hello.', opts)

    expect(requests).toHaveLength(3)
  })

  test('gives up after the retry cap and throws with the status code', async () => {
    respond(500)
    await expect(synthesizeChunk('Hello.', { ...opts, maxAttempts: 3 })).rejects.toThrow(/500/)

    expect(requests).toHaveLength(3)
  })

  test('does not retry on 401 — an auth error is not transient', async () => {
    respond(401)
    await expect(synthesizeChunk('Hello.', opts)).rejects.toThrow(/401/)

    expect(requests).toHaveLength(1)
  })

  // 413 means the chunker is broken, not that the request was unlucky.
  test('does not retry on 413 and names the character limit in the error', async () => {
    respond(413)
    await expect(synthesizeChunk('Hello.', opts)).rejects.toThrow(/character limit/i)

    expect(requests).toHaveLength(1)
  })

  test('refuses to send a chunk at or above the API character limit', async () => {
    respond('ok')
    await expect(synthesizeChunk('x'.repeat(MAX_REQUEST_CHARS), opts)).rejects.toThrow(
      /character limit/i,
    )

    expect(requests).toHaveLength(0)
  })

  test('every chunk the chunker produces is accepted by that guard', async () => {
    respond('ok')
    const chapter = 'A sentence of prose. '.repeat(600)

    for (const chunk of chunkText(chapter)) {
      expect(chunk.length).toBeLessThan(MAX_REQUEST_CHARS)
    }
  })
})
