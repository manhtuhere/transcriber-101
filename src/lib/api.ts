import type { Session } from '@supabase/supabase-js'
import type { BookSummary, BookWithChapters } from '../types/book'
import type { Manifest } from '../types/manifest'
import type { BookDraft } from '../utils/buildInsert'
import { supabase } from './supabase'

// Every Supabase call in the app goes through this module. Components never
// import `supabase` directly — that is what keeps them mockable at the UI
// test layer.

export async function signInWithOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${window.location.origin}/dashboard` },
  })
  if (error) throw error
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function listBooks(): Promise<BookSummary[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*, chapters(count)')
    .order('created_at', { ascending: false })
  if (error) throw error
  // The status check constraint is not visible to the generated types, so the
  // narrowing happens here, at the single point where rows enter the app.
  return data as BookSummary[]
}

/**
 * Insert a book and its chapters, returning the new book id.
 *
 * Two statements, because chapter rows need the generated book id. If the
 * chapter insert fails the book row is deleted rather than left behind as an
 * empty book the dashboard would render forever.
 */
export async function createBook(draft: BookDraft): Promise<string> {
  const { data: book, error } = await supabase
    .from('books')
    .insert(draft.book)
    .select('id')
    .single()
  if (error) throw error

  const { error: chapterError } = await supabase
    .from('chapters')
    .insert(draft.chapters.map((chapter) => ({ ...chapter, book_id: book.id })))

  if (chapterError) {
    await supabase.from('books').delete().eq('id', book.id)
    throw chapterError
  }

  return book.id
}

export async function getBook(id: string): Promise<BookWithChapters> {
  const { data, error } = await supabase
    .from('books')
    .select('*, chapters(*)')
    .eq('id', id)
    .order('idx', { referencedTable: 'chapters' })
    .single()
  if (error) throw error
  return data as BookWithChapters
}

/** Signed URL for a private bucket object, valid for the listening session. */
export async function signAudioUrl(path: string, expiresInSec = 60 * 60 * 4): Promise<string> {
  const { data, error } = await supabase.storage
    .from('audio')
    .createSignedUrl(path, expiresInSec)
  if (error) throw error
  return data.signedUrl
}

/**
 * The manifest is the chapter-marker source. Falling back to the chapter rows
 * would duplicate the offset logic, so a book without one is an error the
 * player surfaces rather than papers over.
 */
export async function getManifest(bookId: string): Promise<Manifest> {
  const { data, error } = await supabase.storage.from('audio').download(`${bookId}/manifest.json`)
  if (error) throw error
  return JSON.parse(await data.text()) as Manifest
}

export async function retryChapter(chapterId: string): Promise<void> {
  const { error } = await supabase
    .from('chapters')
    .update({ status: 'pending', error: null, claimed_at: null })
    .eq('id', chapterId)
    .eq('status', 'failed')
  if (error) throw error
}

/**
 * Live chapter updates for one book.
 *
 * Requires `chapters` to be a member of the supabase_realtime publication —
 * see migration 0004. Without it this subscribes successfully and then never
 * fires, which is why there is an integration test asserting membership.
 */
export function subscribeToChapters(bookId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`chapters:${bookId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chapters', filter: `book_id=eq.${bookId}` },
      onChange,
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
