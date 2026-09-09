import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { subscribeToChapters } from '../lib/api'
import { keys } from './keys'

/**
 * Refetch a book whenever the worker touches one of its chapters.
 *
 * The worker runs outside the browser, so progress arrives by Realtime rather
 * than by polling. Requires `chapters` to be in the supabase_realtime
 * publication — migration 0004.
 */
export function useChapterUpdates(bookId: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (bookId === '') return
    return subscribeToChapters(bookId, () => {
      void queryClient.invalidateQueries({ queryKey: keys.book(bookId) })
    })
  }, [bookId, queryClient])
}
