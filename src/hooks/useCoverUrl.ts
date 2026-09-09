import { useQuery } from '@tanstack/react-query'
import { AUDIO_URL_TTL_SEC } from '../constants/playback'
import { signCoverUrl } from '../lib/api'
import { keys } from './keys'

/**
 * A signed URL for a book's cover, or nothing when the book has none.
 *
 * Held for most of its life rather than refetched, for the same reason as the
 * audio URL: re-signing produces a different URL, which would reload the image
 * and make the shelf flicker.
 */
export function useCoverUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: keys.cover(path),
    queryFn: () => signCoverUrl(path!),
    enabled: Boolean(path),
    staleTime: (AUDIO_URL_TTL_SEC - 600) * 1000,
    gcTime: AUDIO_URL_TTL_SEC * 1000,
    refetchOnWindowFocus: false,
  })
}
