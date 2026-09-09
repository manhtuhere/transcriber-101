import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addBookmark } from '../lib/api'
import { keys } from './keys'

/** Save the spot you are at. */
export function useAddBookmark(bookId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { positionSec: number; note?: string }>({
    mutationFn: ({ positionSec, note }) => addBookmark(bookId, positionSec, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.bookmarks(bookId) }),
  })
}
