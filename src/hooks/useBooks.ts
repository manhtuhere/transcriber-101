import { useQuery } from '@tanstack/react-query'
import { listBooks } from '../lib/api'
import { keys } from './keys'

/** Every book in the library, newest first. */
export function useBooks() {
  return useQuery({ queryKey: keys.books, queryFn: listBooks })
}
