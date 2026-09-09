import { createClient } from '@supabase/supabase-js'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { ffmpegAvailable } from '../../scripts/lib/audio'
import { DEEPGRAM_SPEAK_URL } from '../../scripts/lib/deepgram'
import {
  AUDIO_BUCKET,
  finalizeBookIfComplete,
  synthesizeChapter,
  type Client,
} from '../../scripts/lib/synthesize'
import type { Database } from '../../src/types/database'
import { toneWav } from '../fixtures/tone'
import 'dotenv/config'

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env

const hasKey = Boolean(SUPABASE_SECRET_KEY)
const hasFfmpeg = await ffmpegAvailable()
const runnable = hasKey && hasFfmpeg

if (!runnable) {
  console.warn(
    '\n  SKIPPING synthesis integration tests.' +
      (hasKey ? '' : '\n    - SUPABASE_SECRET_KEY is not set in .env') +
      (hasFfmpeg ? '' : '\n    - ffmpeg/ffprobe are not on PATH (sudo apt install ffmpeg)') +
      '\n  These cover the concat, probe and upload path end to end.\n',
  )
}

const TONE = toneWav({ seconds: 0.5 })

let deepgramCalls = 0
const server = setupServer()

describe.skipIf(!runnable)('chapter synthesis', () => {
  let supabase: Client
  let userId: string
  // Storage has no foreign key, so cascade-deleting books leaves audio behind.
  // Every book this suite creates is tracked and its folder cleared in afterAll.
  const createdBooks: string[] = []

  beforeAll(async () => {
    server.listen({ onUnhandledRequest: 'bypass' })
    supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_SECRET_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabase.auth.admin.createUser({
      email: `synth-${crypto.randomUUID()}@test.local`,
      password: crypto.randomUUID(),
      email_confirm: true,
    })
    if (error) throw error
    userId = data.user.id
  })

  afterEach(() => {
    server.resetHandlers()
    deepgramCalls = 0
  })

  afterAll(async () => {
    for (const id of createdBooks) {
      const { data: files } = await supabase.storage.from(AUDIO_BUCKET).list(id, { limit: 1000 })
      const paths = (files ?? []).map((file) => `${id}/${file.name}`)
      if (paths.length > 0) await supabase.storage.from(AUDIO_BUCKET).remove(paths)
    }
    await supabase.auth.admin.deleteUser(userId)
    server.close()
  })

  function deepgramReturns(status: number | 'ok') {
    server.use(
      http.post(DEEPGRAM_SPEAK_URL, () => {
        deepgramCalls += 1
        if (status === 'ok') return HttpResponse.arrayBuffer(TONE.buffer as ArrayBuffer)
        return new HttpResponse(null, { status })
      }),
    )
  }

  async function seedBook(text: string, chapterCount = 1) {
    const { data: book, error } = await supabase
      .from('books')
      .insert({ title: 'Synth Test', author: 'T', owner_id: userId, status: 'processing' })
      .select()
      .single()
    if (error) throw error
    createdBooks.push(book.id)

    const rows = Array.from({ length: chapterCount }, (_, idx) => ({
      book_id: book.id,
      owner_id: userId,
      idx,
      title: `Chapter ${idx + 1}`,
      text_content: text,
      char_count: text.length,
      tts_voice: 'aura-2-thalia-en',
      status: 'pending' as const,
    }))

    const { data: chapters, error: chapterError } = await supabase
      .from('chapters')
      .insert(rows)
      .select()
    if (chapterError) throw chapterError
    return { book, chapters: chapters! }
  }

  const deps = () => ({ supabase, deepgramApiKey: 'test-key' })

  test('synthesizes a chapter end to end', async () => {
    deepgramReturns('ok')
    // Two sentences well over the chunk size force two Deepgram calls.
    const { chapters } = await seedBook(`${'Sentence one. '.repeat(200)}`)

    await synthesizeChapter(chapters[0]!, deps())

    const { data } = await supabase.from('chapters').select().eq('id', chapters[0]!.id).single()
    expect(data!.status).toBe('ready')
    expect(data!.audio_path).toMatch(/^.+\/0-chapter-1\.mp3$/)
    expect(deepgramCalls).toBeGreaterThan(1)
    // Each mocked chunk is 0.5 s, so the concatenation should be about that
    // many half-seconds long.
    expect(data!.duration_sec).toBeGreaterThan(0.4 * deepgramCalls)
  })

  test('uploads a playable mp3 that ffprobe reads back as mono', async () => {
    deepgramReturns('ok')
    const { chapters } = await seedBook('A short chapter.')

    await synthesizeChapter(chapters[0]!, deps())
    const { data: row } = await supabase
      .from('chapters')
      .select('audio_path')
      .eq('id', chapters[0]!.id)
      .single()

    const { data: file, error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .download(row!.audio_path!)
    expect(error).toBeNull()
    expect((await file!.arrayBuffer()).byteLength).toBeGreaterThan(0)
  })

  test('marks the chapter failed and records the error when Deepgram gives up', async () => {
    deepgramReturns(500)
    const { chapters } = await seedBook('Will fail.')

    await expect(
      synthesizeChapter(chapters[0]!, { ...deps(), concurrency: 1 }),
    ).rejects.toThrow()

    const { data } = await supabase.from('chapters').select().eq('id', chapters[0]!.id).single()
    expect(data!.status).toBe('failed')
    expect(data!.error).toBeTruthy()
    expect(data!.audio_path).toBeNull()
  })

  test('claim_next_chapter returns one row and marks it synthesizing', async () => {
    await seedBook('Claim me.')
    const { data, error } = await supabase.rpc('claim_next_chapter')

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0]!.status).toBe('synthesizing')
    expect(data![0]!.claimed_at).toBeTruthy()
  })

  test('two concurrent claims never return the same chapter', async () => {
    await seedBook('Two chapters.', 2)

    const [first, second] = await Promise.all([
      supabase.rpc('claim_next_chapter'),
      supabase.rpc('claim_next_chapter'),
    ])

    const ids = [first.data?.[0]?.id, second.data?.[0]?.id].filter(Boolean)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('release_stale_claims returns claims older than the cutoff to pending', async () => {
    const { chapters } = await seedBook('Stale.')
    await supabase
      .from('chapters')
      .update({ status: 'synthesizing', claimed_at: '2000-01-01T00:00:00Z' })
      .eq('id', chapters[0]!.id)

    const { data: released } = await supabase.rpc('release_stale_claims', {
      max_age: '1 minute',
    })
    expect(released).toBeGreaterThan(0)

    const { data } = await supabase.from('chapters').select().eq('id', chapters[0]!.id).single()
    expect(data!.status).toBe('pending')
  })

  test('does not flip the book to ready while any chapter is still pending', async () => {
    deepgramReturns('ok')
    const { book, chapters } = await seedBook('Half done.', 2)

    await synthesizeChapter(chapters[0]!, deps())
    expect(await finalizeBookIfComplete(supabase, book.id)).toBe(false)

    const { data } = await supabase.from('books').select('status').eq('id', book.id).single()
    expect(data!.status).toBe('processing')
  })

  test('writes the manifest and flips the book to ready once every chapter is done', async () => {
    deepgramReturns('ok')
    const { book, chapters } = await seedBook('All done.', 2)

    for (const chapter of chapters) await synthesizeChapter(chapter, deps())
    expect(await finalizeBookIfComplete(supabase, book.id)).toBe(true)

    const { data: row } = await supabase.from('books').select().eq('id', book.id).single()
    expect(row!.status).toBe('ready')
    expect(row!.total_duration_sec).toBeGreaterThan(0)

    const { data: file } = await supabase.storage
      .from(AUDIO_BUCKET)
      .download(`${book.id}/manifest.json`)
    const manifest = JSON.parse(await file!.text())

    expect(manifest.chapters).toHaveLength(2)
    expect(manifest.chapters[0].startOffsetSec).toBe(0)
    expect(manifest.chapters[1].startOffsetSec).toBe(manifest.chapters[0].durationSec)
    expect(manifest.totalDurationSec).toBeCloseTo(row!.total_duration_sec!, 3)
  })

  test('persists start_offset_sec on the chapter rows too', async () => {
    deepgramReturns('ok')
    const { book, chapters } = await seedBook('Offsets.', 2)

    for (const chapter of chapters) await synthesizeChapter(chapter, deps())
    await finalizeBookIfComplete(supabase, book.id)

    const { data } = await supabase
      .from('chapters')
      .select('idx, start_offset_sec')
      .eq('book_id', book.id)
      .order('idx')

    expect(data![0]!.start_offset_sec).toBe(0)
    expect(data![1]!.start_offset_sec).toBeGreaterThan(0)
  })
})
