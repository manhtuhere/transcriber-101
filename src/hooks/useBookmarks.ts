import { useQuery } from '@tanstack/react-query'
import { listBookmarks } from '../lib/api'
import { keys } from './keys'

/** Saved spots in a book, earliest first. */
export function useBookmarks(bookId: string) {
  return useQuery({
    queryKey: keys.bookmarks(bookId),
    queryFn: () => listBookmarks(bookId),
    enabled: bookId !== '',
  })
}
