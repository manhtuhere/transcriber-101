import { useQuery } from '@tanstack/react-query'
import { getSession } from '../lib/api'
import { isAuthBypassed } from '../lib/devAuth'
import { keys } from './keys'

/**
 * The current Supabase session, or null.
 *
 * Disabled entirely while the dev bypass is on, which is what keeps getSession
 * from firing when the app is deliberately running signed-out. The literal DEV
 * check keeps the whole condition foldable in a production build.
 */
export function useSession() {
  return useQuery({
    queryKey: keys.session,
    queryFn: getSession,
    enabled: !(import.meta.env.DEV && isAuthBypassed()),
  })
}
