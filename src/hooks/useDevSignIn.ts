import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { Session } from '@supabase/supabase-js'
import { signInWithPassword } from '../lib/api'
import { devCredentials } from '../lib/devAuth'
import { keys } from './keys'

/**
 * One-click sign-in to the local dev account.
 *
 * Produces a genuine Supabase session, so every RLS policy applies exactly as
 * it will in production — the point is to skip the email round trip, not to
 * skip authorization.
 */
export function useDevSignIn() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation<Session | null, Error, void>({
    mutationFn: async () => {
      // Login calls this hook unconditionally, as hooks must, so the shell
      // ships. The literal DEV guard folds the body — instructions, env var
      // names and all — out of a production build.
      if (!import.meta.env.DEV) throw new Error('Not available.')

      const credentials = devCredentials()
      if (!credentials) {
        throw new Error(
          'Set VITE_DEV_EMAIL and VITE_DEV_PASSWORD in .env, and create that user in ' +
            'Supabase (Authentication → Users → Add user, with "Auto Confirm User" on).',
        )
      }
      return signInWithPassword(credentials.email, credentials.password)
    },
    /*
      Write the session into the cache rather than invalidating it.
      Invalidation does not refetch a query with no active observer, and the
      route guard is not mounted while the sign-in page is showing — so it
      would mount, read the `null` cached when the guard bounced us here, and
      bounce straight back before any background refetch resolved. Seeding the
      value the sign-in just returned leaves no window for that race.
    */
    onSuccess: (session) => {
      queryClient.setQueryData(keys.session, session)
      void navigate({ to: '/dashboard' })
    },
  })
}
