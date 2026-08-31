import type { Session } from '@supabase/supabase-js'
import type { Bookmark, BookSummary, BookWithChapters } from '../types/book'
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

/**
 * Password sign-in. Used only by the dev shortcut on the sign-in page — the
 * product itself authenticates with a magic link.
 */
export async function signInWithPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
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

/**
 * Mark or unmark a book as a favourite.
 *
 * Writes a timestamp rather than a boolean, so the shelf can order by when it
 * was marked. RLS needs no new policy: this is an update to a column on a row
 * the caller already owns.
 */
export async function setFavorite(bookId: string, favorite: boolean): Promise<void> {
  const { error } = await supabase
    .from('books')
    .update({ favorited_at: favorite ? new Date().toISOString() : null })
    .eq('id', bookId)
  if (error) throw error
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

/** Saved spots in a book, earliest first. */
export async function listBookmarks(bookId: string): Promise<Bookmark[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('book_id', bookId)
    .order('position_sec')
  if (error) throw error
  return data
}

export async function addBookmark(
  bookId: string,
  positionSec: number,
  note?: string,
): Promise<void> {
  const { error } = await supabase
    .from('bookmarks')
    .insert({ book_id: bookId, position_sec: positionSec, note: note ?? null })
  if (error) throw error
}

export async function deleteBookmark(id: string): Promise<void> {
  const { error } = await supabase.from('bookmarks').delete().eq('id', id)
  if (error) throw error
}

/**
 * Delete a book, its chapters, and its audio.
 *
 * Storage has no foreign key, so the objects have to go first and explicitly:
 * deleting the row cascades the chapter rows but would leave every mp3 and the
 * manifest behind, invisible and still counting against the storage quota.
 * Audio first, then the row — an orphaned object is recoverable by
 * `npm run clean:storage`, an orphaned row is not.
 */
export async function deleteBook(bookId: string): Promise<void> {
  const { data: files, error: listError } = await supabase.storage
    .from('audio')
    .list(bookId, { limit: 1000 })
  if (listError) throw listError

  const paths = (files ?? []).map((file) => `${bookId}/${file.name}`)
  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from('audio').remove(paths)
    if (removeError) throw removeError
  }

  const { error } = await supabase.from('books').delete().eq('id', bookId)
  if (error) throw error
}
