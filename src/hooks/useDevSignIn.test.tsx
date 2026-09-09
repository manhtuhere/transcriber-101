import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { keys } from './keys'
import { useDevSignIn } from './useDevSignIn'

const navigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))

vi.mock('../lib/api', () => ({ signInWithPassword: vi.fn() }))
const api = vi.mocked(await import('../lib/api'))

vi.mock('../lib/devAuth', () => ({
  devCredentials: () => ({ email: 'dev@local', password: 'secret' }),
}))

const session = { access_token: 'token', user: { email: 'dev@local' } }

let queryClient: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe('useDevSignIn', () => {
  /*
    Regression test.

    Being bounced to the sign-in page from a protected route caches
    `session: null`. Invalidating that query does not refetch it, because
    nothing is observing it while the sign-in page is showing — so the guard
    would mount, read the stale null, and bounce straight back. Seeding the
    session the sign-in returned is what closes that window.
  */
  test('seeds the session into the cache before navigating', async () => {
    queryClient.setQueryData(keys.session, null) // as the route guard left it
    api.signInWithPassword.mockResolvedValue(session as never)

    const { result } = renderHook(() => useDevSignIn(), { wrapper })
    result.current.mutate()

    await waitFor(() => expect(queryClient.getQueryData(keys.session)).toEqual(session))
  })

  test('navigates to the library once signed in', async () => {
    api.signInWithPassword.mockResolvedValue(session as never)

    const { result } = renderHook(() => useDevSignIn(), { wrapper })
    result.current.mutate()

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/dashboard' }))
  })

  test('does not navigate when the sign-in fails', async () => {
    api.signInWithPassword.mockRejectedValue(new Error('bad password'))

    const { result } = renderHook(() => useDevSignIn(), { wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(navigate).not.toHaveBeenCalled()
  })
})
