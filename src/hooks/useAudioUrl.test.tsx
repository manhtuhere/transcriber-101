import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { useAudioUrl } from './useAudioUrl'

vi.mock('../lib/api', () => ({ signAudioUrl: vi.fn() }))
const api = vi.mocked(await import('../lib/api'))

let queryClient: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({
    // The app's default, which is what made this destructive.
    defaultOptions: { queries: { retry: false, staleTime: 30_000 } },
  })
})

describe('useAudioUrl', () => {
  test('signs the chapter path', async () => {
    api.signAudioUrl.mockResolvedValue('https://cdn.test/a.mp3')
    const { result } = renderHook(() => useAudioUrl('b1/0-a.mp3'), { wrapper })

    await waitFor(() => expect(result.current.data).toBe('https://cdn.test/a.mp3'))
    expect(api.signAudioUrl).toHaveBeenCalledWith('b1/0-a.mp3')
  })

  test('does not sign anything without a path', () => {
    renderHook(() => useAudioUrl(undefined), { wrapper })
    expect(api.signAudioUrl).not.toHaveBeenCalled()
  })

  /*
    Regression test.

    Signing the same object twice yields two different URLs, and swapping the
    `src` of a playing audio element reloads it from zero. Under the app's
    30-second default stale time, returning to a chapter played more than half
    a minute earlier re-signed the URL and threw away the listener's place —
    skipping back over a chapter boundary lost it every time.
  */
  test('holds one URL rather than re-signing it under the player', async () => {
    api.signAudioUrl.mockResolvedValue('https://cdn.test/a.mp3?token=first')

    const first = renderHook(() => useAudioUrl('b1/0-a.mp3'), { wrapper })
    await waitFor(() => expect(first.result.current.data).toContain('token=first'))

    // Long past the app's default stale time.
    vi.setSystemTime(Date.now() + 10 * 60 * 1000)
    api.signAudioUrl.mockResolvedValue('https://cdn.test/a.mp3?token=second')

    const again = renderHook(() => useAudioUrl('b1/0-a.mp3'), { wrapper })
    await waitFor(() => expect(again.result.current.data).toContain('token=first'))
    expect(api.signAudioUrl).toHaveBeenCalledTimes(1)
  })
})
