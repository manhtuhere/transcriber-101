import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getSession, onAuthStateChange } from '../lib/api'
import { keys } from './keys'

/**
 * The current Supabase session, or null.
 *
 * The subscription is not optional. Queries are cached with a stale time, so
 * after being bounced to the sign-in page — which caches `null` — signing in
 * would leave the guard reading that stale null and bouncing straight back.
 * Invalidating on every auth change also covers the magic-link return, signing
 * out, a token refresh, and the same account in another tab.
 */
export function useSession() {
  const queryClient = useQueryClient()

  useEffect(
    () => onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: keys.session })
    }),
    [queryClient],
  )

  return useQuery({ queryKey: keys.session, queryFn: getSession })
}
