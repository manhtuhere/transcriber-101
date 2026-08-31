import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setFavorite } from '../lib/api'
import type { BookSummary } from '../types/book'
import { keys } from './keys'

interface Toggle {
  bookId: string
  favorite: boolean
}

/**
 * Mark or unmark a favourite, updating the shelf before the round trip
 * finishes — a star that waits on the network feels broken. The previous list
 * is restored if the write fails.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, Toggle, { previous?: BookSummary[] }>({
    mutationFn: ({ bookId, favorite }) => setFavorite(bookId, favorite),

    onMutate: async ({ bookId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: keys.books })
      const previous = queryClient.getQueryData<BookSummary[]>(keys.books)

      queryClient.setQueryData<BookSummary[]>(keys.books, (books) =>
        books?.map((book) =>
          book.id === bookId
            ? { ...book, favorited_at: favorite ? new Date().toISOString() : null }
            : book,
        ),
      )

      return { previous }
    },

    onError: (_error, _toggle, context) => {
      if (context?.previous) queryClient.setQueryData(keys.books, context.previous)
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: keys.books }),
  })
}
