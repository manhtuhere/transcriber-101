import { useMutation, useQueryClient } from '@tanstack/react-query'
import { retryChapter } from '../lib/api'
import { keys } from './keys'

/** Put a failed chapter back in the worker's queue. */
export function useRetryChapter(bookId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (chapterId) => retryChapter(chapterId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.book(bookId) }),
  })
}
