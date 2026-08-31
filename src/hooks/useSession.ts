import { useQuery } from '@tanstack/react-query'
import { getSession } from '../lib/api'
import { keys } from './keys'

/** The current Supabase session, or null. */
export function useSession() {
  return useQuery({ queryKey: keys.session, queryFn: getSession })
}
