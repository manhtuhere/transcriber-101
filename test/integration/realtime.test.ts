import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Database } from '../../src/types/database'
import 'dotenv/config'

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env
const configured = Boolean(SUPABASE_SECRET_KEY)

if (!configured) {
  console.warn('\n  SKIPPING realtime + retry integration tests: SUPABASE_SECRET_KEY not set.\n')
}

describe.skipIf(!configured)('realtime and retry', () => {
  let supabase: ReturnType<typeof createClient<Database>>
  let userId: string
  let bookId: string
  let chapterId: string

  beforeAll(async () => {
    supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_SECRET_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabase.auth.admin.createUser({
      email: `rt-${crypto.randomUUID()}@test.local`,
      password: crypto.randomUUID(),
      email_confirm: true,
    })
    if (error) throw error
    userId = data.user.id

    const { data: book } = await supabase
      .from('books')
      .insert({ title: 'RT', owner_id: userId, status: 'processing' })
      .select()
      .single()
    bookId = book!.id

    const { data: chapter } = await supabase
      .from('chapters')
      .insert({
        book_id: bookId,
        owner_id: userId,
        idx: 0,
        title: 'One',
        text_content: 'x',
        char_count: 1,
        status: 'failed',
        error: 'boom',
      })
      .select()
      .single()
    chapterId = chapter!.id
  })

  afterAll(async () => {
    await supabase.auth.admin.deleteUser(userId)
  })

  test('an update delivers a realtime payload — proving chapters is in the publication', async () => {
    const received = new Promise<{ status: string }>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('No realtime payload within 10s — is chapters in the publication?')),
        10_000,
      )

      const channel = supabase
        .channel(`test:${chapterId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'chapters', filter: `id=eq.${chapterId}` },
          (payload) => {
            clearTimeout(timer)
            void supabase.removeChannel(channel)
            resolve(payload.new as { status: string })
          },
        )
        .subscribe((status, err) => {
          if (err) {
            clearTimeout(timer)
            reject(new Error(`Subscription failed: ${err.message}`))
            return
          }
          if (status !== 'SUBSCRIBED') return
          // SUBSCRIBED is reported before the server-side postgres_changes
          // listener is fully registered. Updating immediately races it and the
          // payload is never delivered — the change happens before anyone is
          // listening. Verified: without this delay the test times out while
          // realtime itself is working correctly.
          setTimeout(() => {
            // .then(), not `void`: a PostgREST builder is a lazy thenable and
            // sends nothing until it is awaited. `void builder` constructs the
            // request and discards it, so the update never reaches the server
            // and no payload can arrive.
            supabase
              .from('chapters')
              .update({ status: 'pending', error: null })
              .eq('id', chapterId)
              .then(({ error }) => {
                if (error) {
                  clearTimeout(timer)
                  reject(new Error(`Update failed: ${error.message}`))
                }
              })
          }, 750)
        })
    })

    await expect(received).resolves.toMatchObject({ status: 'pending' })
  })

  test('retry resets a failed chapter to pending and clears the error', async () => {
    await supabase
      .from('chapters')
      .update({ status: 'failed', error: 'boom' })
      .eq('id', chapterId)

    await supabase
      .from('chapters')
      .update({ status: 'pending', error: null, claimed_at: null })
      .eq('id', chapterId)
      .eq('status', 'failed')

    const { data } = await supabase.from('chapters').select().eq('id', chapterId).single()
    expect(data!.status).toBe('pending')
    expect(data!.error).toBeNull()
  })

  test('a re-run worker claims the retried chapter', async () => {
    const { data } = await supabase.rpc('claim_next_chapter')
    expect(data?.[0]?.id).toBeTruthy()
  })
})
