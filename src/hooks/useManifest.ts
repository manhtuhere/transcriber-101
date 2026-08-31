import { useQuery } from '@tanstack/react-query'
import { getManifest } from '../lib/api'
import { keys } from './keys'

/** The chapter manifest: titles, durations and cumulative offsets. */
export function useManifest(bookId: string) {
  return useQuery({
    queryKey: keys.manifest(bookId),
    queryFn: () => getManifest(bookId),
    enabled: bookId !== '',
  })
}
