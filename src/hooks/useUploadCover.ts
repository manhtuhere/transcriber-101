import { useMutation, useQueryClient } from '@tanstack/react-query'
import { removeCover, uploadCover } from '../lib/api'
import { keys } from './keys'

/** Set or replace a book's cover. */
export function useUploadCover(bookId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, File>({
    mutationFn: (file) => uploadCover(bookId, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.book(bookId) })
      await queryClient.invalidateQueries({ queryKey: keys.books })
    },
  })
}

/**
 * Set a cover on a book named at call time.
 *
 * The upload form needs this: the storage path is keyed by book id, and there
 * is no id until the insert comes back, so the hook cannot be bound to one the
 * way `useUploadCover` is.
 */
export function useUploadCoverFor() {
  const queryClient = useQueryClient()

  return useMutation<void, Error, { bookId: string; file: File }>({
    mutationFn: ({ bookId, file }) => uploadCover(bookId, file),
    onSuccess: async (_data, { bookId }) => {
      await queryClient.invalidateQueries({ queryKey: keys.book(bookId) })
      await queryClient.invalidateQueries({ queryKey: keys.books })
    },
  })
}

/** Drop a book's cover, so it falls back to its printed binding. */
export function useRemoveCover(bookId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: (path) => removeCover(bookId, path),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: keys.book(bookId) })
      await queryClient.invalidateQueries({ queryKey: keys.books })
    },
  })
}
