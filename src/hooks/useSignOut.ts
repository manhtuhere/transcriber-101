import { useMutation, useQueryClient } from '@tanstack/react-query'
import { signOut } from '../lib/api'

/** Sign out and drop every cached query, so nothing of the old session lingers. */
export function useSignOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => signOut(),
    onSuccess: () => queryClient.clear(),
  })
}
