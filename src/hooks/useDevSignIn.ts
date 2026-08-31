import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { signInWithPassword } from '../lib/api'
import { devCredentials } from '../lib/devAuth'

/**
 * One-click sign-in to the local dev account.
 *
 * Produces a genuine Supabase session, so every RLS policy applies exactly as
 * it will in production — the point is to skip the email round trip, not to
 * skip authorization.
 */
export function useDevSignIn() {
  const navigate = useNavigate()

  return useMutation<void, Error, void>({
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
      await signInWithPassword(credentials.email, credentials.password)
    },
    onSuccess: () => void navigate({ to: '/dashboard' }),
  })
}
