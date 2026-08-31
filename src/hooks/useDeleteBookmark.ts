import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteBookmark } from '../lib/api'
import { keys } from './keys'

export function useDeleteBookmark(bookId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (id) => deleteBookmark(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.bookmarks(bookId) }),
  })
}
