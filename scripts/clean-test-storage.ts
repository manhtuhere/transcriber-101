import { createClient } from '@supabase/supabase-js'
import type { Database } from '../src/types/database'
import { readWorkerEnv } from './lib/env'
import { AUDIO_BUCKET } from './lib/synthesize'

/**
 * Remove audio objects whose book row no longer exists.
 *
 * Deleting a book cascades to its chapters, but Storage has no foreign key —
 * objects are left behind. The integration tests create and drop books
 * constantly, so without this the bucket accumulates orphans against a 1 GB
 * free tier.
 *
 * Only touches folders with no matching book, so it is safe to run at any time.
 * Pass --dry-run to list what would go without removing anything.
 */
async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const { supabaseUrl, supabaseSecretKey } = readWorkerEnv()

  const supabase = createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: books, error } = await supabase.from('books').select('id')
  if (error) throw error
  const live = new Set(books.map((book) => book.id))

  const { data: folders, error: listError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .list('', { limit: 1000 })
  if (listError) throw listError

  let removed = 0
  let kept = 0

  for (const folder of folders ?? []) {
    if (live.has(folder.name)) {
      kept += 1
      continue
    }

    const { data: files } = await supabase.storage
      .from(AUDIO_BUCKET)
      .list(folder.name, { limit: 1000 })
    const paths = (files ?? []).map((file) => `${folder.name}/${file.name}`)
    if (paths.length === 0) continue

    if (dryRun) {
      console.log(`would remove ${paths.length} object(s) under ${folder.name}/`)
    } else {
      const { error: removeError } = await supabase.storage.from(AUDIO_BUCKET).remove(paths)
      if (removeError) {
        console.error(`  ${folder.name}: ${removeError.message}`)
        continue
      }
    }
    removed += paths.length
  }

  console.log(
    dryRun
      ? `Dry run: ${removed} orphaned object(s) would be removed, ${kept} live book(s) kept.`
      : `Removed ${removed} orphaned object(s); kept ${kept} live book(s).`,
  )
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
