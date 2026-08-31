import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createBook } from '../lib/api'
import type { BookDraft } from '../utils/buildInsert'
import { keys } from './keys'

/**
 * Write a book and its chapters, then invalidate the library so the new book is
 * there when the caller navigates to it.
 */
export function useCreateBook() {
  const queryClient = useQueryClient()

  return useMutation<string, Error, BookDraft>({
    mutationFn: (draft) => createBook(draft),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.books }),
  })
}
