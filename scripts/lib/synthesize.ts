import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database'
import { concatToMp3 } from './audio'
import { chunkText } from './chunkText'
import { synthesizeChunk } from './deepgram'
import { buildManifest } from './manifest'

export type Client = SupabaseClient<Database>

type ChapterRow = Database['public']['Tables']['chapters']['Row']

export const AUDIO_BUCKET = 'audio'

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'chapter'
  )
}

/** FNV-1a, matching src/utils/hash.ts — the chunk cache key must agree. */
function hashText(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export interface SynthesizeDeps {
  supabase: Client
  deepgramApiKey: string
  concurrency?: number
}

/**
 * Turn one claimed chapter into an mp3 in Storage.
 *
 * Chunks already synthesized for the same (text_hash, tts_voice) are skipped,
 * so re-running after an edit only pays for what changed.
 */
export async function synthesizeChapter(
  chapter: ChapterRow,
  { supabase, deepgramApiKey, concurrency = 3 }: SynthesizeDeps,
): Promise<void> {
  try {
    const pieces = chunkText(chapter.text_content)
    if (pieces.length === 0) throw new Error('Chapter has no text to synthesize.')

    const audio = await synthesizeAll(pieces, { supabase, deepgramApiKey, concurrency }, chapter)
    const encoded = await concatToMp3(audio)

    const path = `${chapter.book_id}/${chapter.idx}-${slugify(chapter.title)}.mp3`
    const { error: uploadError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(path, encoded.data, { contentType: 'audio/mpeg', upsert: true })
    if (uploadError) throw uploadError

    const { error } = await supabase
      .from('chapters')
      .update({
        status: 'ready',
        audio_path: path,
        duration_sec: encoded.durationSec,
        bytes: encoded.bytes,
        error: null,
      })
      .eq('id', chapter.id)
    if (error) throw error
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause)
    await supabase
      .from('chapters')
      .update({ status: 'failed', error: message })
      .eq('id', chapter.id)
    throw cause
  }
}

async function synthesizeAll(
  pieces: string[],
  { supabase, deepgramApiKey, concurrency }: Required<SynthesizeDeps>,
  chapter: ChapterRow,
): Promise<Buffer[]> {
  const audio = new Array<Buffer>(pieces.length)
  let next = 0

  const workers = Array.from({ length: Math.min(concurrency, pieces.length) }, async () => {
    while (next < pieces.length) {
      const index = next
      next += 1
      const text = pieces[index]!

      audio[index] = await synthesizeChunk(text, {
        apiKey: deepgramApiKey,
        voice: chapter.tts_voice,
      })

      await supabase.from('chunks').upsert(
        {
          chapter_id: chapter.id,
          owner_id: chapter.owner_id,
          idx: index,
          text,
          text_hash: hashText(text),
          tts_voice: chapter.tts_voice,
          status: 'ready',
        },
        { onConflict: 'chapter_id,idx' },
      )
    }
  })

  await Promise.all(workers)
  return audio
}

/**
 * Promote a book to `ready` once every chapter is, writing the manifest and the
 * cumulative offsets that serve as chapter markers.
 */
export async function finalizeBookIfComplete(
  supabase: Client,
  bookId: string,
): Promise<boolean> {
  const { data: chapters, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('book_id', bookId)
    .order('idx')
  if (error) throw error
  if (!chapters || chapters.length === 0) return false
  if (chapters.some((chapter) => chapter.status !== 'ready')) return false

  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, title, author')
    .eq('id', bookId)
    .single()
  if (bookError) throw bookError

  const manifest = buildManifest(book, chapters)

  // Persist the offsets on the rows too, so the UI can render markers without
  // fetching the manifest from Storage.
  for (const entry of manifest.chapters) {
    await supabase
      .from('chapters')
      .update({ start_offset_sec: entry.startOffsetSec })
      .eq('book_id', bookId)
      .eq('idx', entry.idx)
  }

  const { error: manifestError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(`${bookId}/manifest.json`, JSON.stringify(manifest, null, 2), {
      contentType: 'application/json',
      upsert: true,
    })
  if (manifestError) throw manifestError

  const { error: updateError } = await supabase
    .from('books')
    .update({ status: 'ready', total_duration_sec: manifest.totalDurationSec })
    .eq('id', bookId)
  if (updateError) throw updateError

  return true
}
