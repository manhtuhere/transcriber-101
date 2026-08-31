import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import type { Database } from '../../src/types/database'
import 'dotenv/config'

const { SUPABASE_URL, SUPABASE_SECRET_KEY, VITE_SUPABASE_PUBLISHABLE_KEY } = process.env

const configured = Boolean(SUPABASE_SECRET_KEY)
if (!configured) {
  console.warn(
    '\n  SKIPPING RLS integration tests: SUPABASE_SECRET_KEY is not set in .env.' +
      "\n  These are the tests that prove one user cannot read another user's books.\n",
  )
}

type Client = SupabaseClient<Database>

function anonClient(): Client {
  return createClient<Database>(SUPABASE_URL!, VITE_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

describe.skipIf(!configured)('row level security', () => {
  // Built in beforeAll, not here: skipIf still runs this callback to collect
  // the tests, and createClient throws on a missing key.
  let admin: Client

  const users: string[] = []
  let alice: Client
  let bob: Client
  let aliceId: string
  let aliceBookId: string
  let aliceChapterId: string

  async function makeUser(): Promise<Client> {
    const email = `rls-${crypto.randomUUID()}@test.local`
    const password = crypto.randomUUID()
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (error) throw error
    users.push(data.user.id)

    const client = anonClient()
    const { error: signInError } = await client.auth.signInWithPassword({ email, password })
    if (signInError) throw signInError
    return client
  }

  beforeAll(async () => {
    admin = createClient<Database>(SUPABASE_URL!, SUPABASE_SECRET_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    alice = await makeUser()
    bob = await makeUser()
    aliceId = (await alice.auth.getSession()).data.session!.user.id

    const { data: book, error } = await alice
      .from('books')
      .insert({ title: 'Alice Only', author: 'A' })
      .select()
      .single()
    if (error) throw error
    aliceBookId = book.id

    const { data: chapter, error: chapterError } = await alice
      .from('chapters')
      .insert({
        book_id: aliceBookId,
        idx: 0,
        title: 'One',
        text_content: 'hello',
        char_count: 5,
      })
      .select()
      .single()
    if (chapterError) throw chapterError
    aliceChapterId = chapter.id
  })

  afterAll(async () => {
    for (const id of users) await admin.auth.admin.deleteUser(id)
  })

  test('owner reads own book', async () => {
    const { data } = await alice.from('books').select().eq('id', aliceBookId)
    expect(data).toHaveLength(1)
  })

  test('non-owner reads zero rows', async () => {
    const { data } = await bob.from('books').select().eq('id', aliceBookId)
    expect(data).toEqual([])
  })

  test('non-owner update is rejected', async () => {
    const { data } = await bob
      .from('books')
      .update({ title: 'Stolen' })
      .eq('id', aliceBookId)
      .select()
    expect(data).toEqual([])

    const { data: still } = await alice.from('books').select('title').eq('id', aliceBookId)
    expect(still![0]!.title).toBe('Alice Only')
  })

  test('non-owner delete is rejected', async () => {
    const { data } = await bob.from('books').delete().eq('id', aliceBookId).select()
    expect(data).toEqual([])

    const { data: still } = await alice.from('books').select().eq('id', aliceBookId)
    expect(still).toHaveLength(1)
  })

  test('anon client reads zero books', async () => {
    const { data } = await anonClient().from('books').select()
    expect(data).toEqual([])
  })

  test('owner_id defaults to auth.uid()', async () => {
    const { data: session } = await alice.auth.getSession()
    const { data } = await alice.from('books').select('owner_id').eq('id', aliceBookId).single()
    expect(data!.owner_id).toBe(session.session!.user.id)
  })

  test('chapter inherits book ownership', async () => {
    const { data: mine } = await alice.from('chapters').select().eq('id', aliceChapterId)
    expect(mine).toHaveLength(1)

    const { data: theirs } = await bob.from('chapters').select().eq('id', aliceChapterId)
    expect(theirs).toEqual([])
  })

  /**
   * Regression test for a real hole found by this suite.
   *
   * The original policy only checked `owner_id = auth.uid()`. Because owner_id
   * defaults to auth.uid(), any authenticated user could insert a chapter
   * pointing at someone else's book_id: the row passed as their own, stayed
   * invisible to the book's owner, and would still be claimed and synthesized
   * by the worker, which runs with the secret key and bypasses RLS. Migration
   * 0005 added an EXISTS check on the parent book.
   */
  test("a non-owner cannot insert a chapter into another user's book", async () => {
    const { error } = await bob.from('chapters').insert({
      book_id: aliceBookId,
      idx: 99,
      title: 'Injected',
      text_content: 'x',
      char_count: 1,
    })
    expect(error).not.toBeNull()
  })

  test("no orphan chapter reaches the worker's queue for another user's book", async () => {
    await bob.from('chapters').insert({
      book_id: aliceBookId,
      idx: 98,
      title: 'Injected',
      text_content: 'x',
      char_count: 1,
    })

    // The secret key sees everything, which is exactly why the insert has to be
    // stopped at the door rather than filtered on read.
    const { data } = await admin.from('chapters').select().eq('book_id', aliceBookId)
    expect(data!.every((row) => row.owner_id === aliceId)).toBe(true)
  })

  test("a non-owner cannot move their own chapter into another user's book", async () => {
    const { data: own } = await bob
      .from('books')
      .insert({ title: "Bob's book" })
      .select()
      .single()
    const { data: chapter } = await bob
      .from('chapters')
      .insert({ book_id: own!.id, idx: 0, title: 'Mine', text_content: 'x', char_count: 1 })
      .select()
      .single()

    const { data: moved, error } = await bob
      .from('chapters')
      .update({ book_id: aliceBookId })
      .eq('id', chapter!.id)
      .select()

    // A with-check violation is an error, not an empty result set: the row is
    // visible to Bob, so the update is attempted and then refused.
    expect(error).not.toBeNull()
    expect(moved).toBeNull()
  })

  test('audio bucket rejects anon download', async () => {
    const { error } = await anonClient().storage.from('audio').download('any/file.mp3')
    expect(error).not.toBeNull()
  })
})
