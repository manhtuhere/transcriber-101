import { useQuery } from '@tanstack/react-query'
import { AUDIO_URL_TTL_SEC } from '../constants/playback'
import { signAudioUrl } from '../lib/api'
import { keys } from './keys'

/**
 * A signed URL for one chapter file. The bucket is private, so this expires.
 *
 * Refetching is destructive here in a way it is not for ordinary data: signing
 * the same object twice yields two *different* URLs, and swapping the `src` of
 * a playing audio element makes it reload and start again from zero. Under the
 * app's default 30-second stale time that happened whenever the listener
 * returned to a chapter they had played more than half a minute earlier —
 * skipping back over a chapter boundary threw away their place.
 *
 * So the URL is held for most of its own lifetime instead. It is refetched only
 * once it is genuinely close to expiring, by which point a reload is warranted.
 */
export function useAudioUrl(path: string | undefined) {
  return useQuery({
    queryKey: keys.audio(path),
    queryFn: () => signAudioUrl(path!),
    enabled: Boolean(path),
    staleTime: (AUDIO_URL_TTL_SEC - 600) * 1000,
    gcTime: AUDIO_URL_TTL_SEC * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
