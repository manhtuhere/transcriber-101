import { useQuery } from '@tanstack/react-query'
import { getBook } from '../lib/api'
import { keys } from './keys'

/** One book with its chapters, ordered by idx. */
export function useBook(id: string) {
  return useQuery({
    queryKey: keys.book(id),
    queryFn: () => getBook(id),
    enabled: id !== '',
  })
}
