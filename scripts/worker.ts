import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'
import { assertFfmpeg } from './lib/audio'
import { readWorkerEnv } from './lib/env'
import { finalizeBookIfComplete, synthesizeChapter } from './lib/synthesize'

const WATCH_INTERVAL_MS = 15_000

/**
 * Drain the pending-chapter queue.
 *
 * Claiming goes through the `claim_next_chapter` Postgres function because
 * PostgREST has no row-locking clause — `FOR UPDATE SKIP LOCKED` cannot be
 * expressed through supabase-js. Killing this process mid-book is safe: the
 * claim it held is released by `release_stale_claims` on the next run.
 */
async function main() {
  const env = readWorkerEnv()
  await assertFfmpeg()

  const watch = process.argv.includes('--watch')

  const supabase = createClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  if (!watch) {
    await drain(supabase, env.deepgramApiKey)
    return
  }

  // Watch mode closes the loop: queue a book in the browser and it starts
  // converting without anyone remembering to run this. Polling rather than
  // Realtime because the worker must also pick up work queued while it was
  // not running, which a subscription would miss.
  console.log(`Watching for pending chapters every ${WATCH_INTERVAL_MS / 1000}s. Ctrl-C to stop.`)

  let stopping = false
  process.on('SIGINT', () => {
    console.log('\nFinishing the current chapter, then stopping…')
    stopping = true
  })

  while (!stopping) {
    await drain(supabase, env.deepgramApiKey, { quiet: true })
    if (stopping) break
    await new Promise((resume) => setTimeout(resume, WATCH_INTERVAL_MS))
  }
}

/** One pass over the queue: claim, synthesize, finalize, until nothing is left. */
async function drain(
  supabase: ReturnType<typeof createClient<Database>>,
  deepgramApiKey: string,
  { quiet = false }: { quiet?: boolean } = {},
) {
  const { data: released } = await supabase.rpc('release_stale_claims')
  if (released) console.log(`Released ${released} stale claim(s).`)

  let done = 0
  const touchedBooks = new Set<string>()

  for (;;) {
    const { data: claimed, error } = await supabase.rpc('claim_next_chapter')
    if (error) throw error

    const chapter = claimed?.[0]
    if (!chapter) break

    console.log(`→ chapter ${chapter.idx + 1} "${chapter.title}" (${chapter.char_count} chars)`)

    try {
      await synthesizeChapter(chapter, { supabase, deepgramApiKey })
      done += 1
      touchedBooks.add(chapter.book_id)
      console.log('  ready')
    } catch (cause) {
      // Already recorded on the row; keep draining the rest of the queue.
      console.error(`  failed: ${cause instanceof Error ? cause.message : String(cause)}`)
      touchedBooks.add(chapter.book_id)
    }
  }

  for (const bookId of touchedBooks) {
    if (await finalizeBookIfComplete(supabase, bookId)) {
      console.log(`Book ${bookId} is ready.`)
    } else {
      await markBookFailedIfStuck(supabase, bookId)
    }
  }

  if (done > 0) console.log(`Synthesized ${done} chapter(s).`)
  else if (!quiet) console.log('Nothing pending.')
}

/** A book with no pending work left but a failed chapter is failed, not stuck. */
async function markBookFailedIfStuck(
  supabase: ReturnType<typeof createClient<Database>>,
  bookId: string,
) {
  const { data } = await supabase.from('chapters').select('status').eq('book_id', bookId)
  if (!data) return

  const stillWorking = data.some((c) => c.status === 'pending' || c.status === 'synthesizing')
  if (!stillWorking && data.some((c) => c.status === 'failed')) {
    await supabase.from('books').update({ status: 'failed' }).eq('id', bookId)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
