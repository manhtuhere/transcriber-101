import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { deleteBook } from '../lib/api'
import { keys } from './keys'

/** Remove a book, its chapters and its audio, then return to the library. */
export function useDeleteBook() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation<void, Error, string>({
    mutationFn: (bookId) => deleteBook(bookId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.books })
      void navigate({ to: '/dashboard' })
    },
  })
}
