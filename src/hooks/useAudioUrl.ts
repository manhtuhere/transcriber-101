import { useQuery } from '@tanstack/react-query'
import { signAudioUrl } from '../lib/api'
import { keys } from './keys'

/** A signed URL for one chapter file. The bucket is private, so this expires. */
export function useAudioUrl(path: string | undefined) {
  return useQuery({
    queryKey: keys.audio(path),
    queryFn: () => signAudioUrl(path!),
    enabled: Boolean(path),
  })
}
