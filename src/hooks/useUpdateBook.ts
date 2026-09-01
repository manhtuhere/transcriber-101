import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateBook } from '../lib/api'
import { keys } from './keys'

/** Change what a book is called, or who wrote it. */
export function useUpdateBook(bookId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { title: string; author: string }>({
    mutationFn: (fields) => updateBook(bookId, fields),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.book(bookId) })
      await queryClient.invalidateQueries({ queryKey: keys.books })
    },
  })
}
