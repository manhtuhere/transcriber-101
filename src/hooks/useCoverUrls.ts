import { useQuery } from '@tanstack/react-query'
import { AUDIO_URL_TTL_SEC } from '../constants/playback'
import { signCoverUrls } from '../lib/api'
import { keys } from './keys'

/**
 * Signed URLs for every cover on the shelf, keyed by storage path.
 *
 * Held for most of their life rather than refetched: re-signing yields
 * different URLs, which would reload every image and make the shelf flicker.
 */
export function useCoverUrls(paths: string[]) {
  const sorted = [...paths].sort()

  return useQuery({
    queryKey: keys.coverBatch(sorted),
    queryFn: () => signCoverUrls(sorted),
    enabled: sorted.length > 0,
    staleTime: (AUDIO_URL_TTL_SEC - 600) * 1000,
    gcTime: AUDIO_URL_TTL_SEC * 1000,
    refetchOnWindowFocus: false,
  })
}
