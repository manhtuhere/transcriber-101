import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../test/renderWithProviders'
import ProtectedRoute from './ProtectedRoute'

vi.mock('../lib/api', () => ({ getSession: vi.fn(), signOut: vi.fn() }))
const api = vi.mocked(await import('../lib/api'))

// The component only checks that a session exists, so a stub stands in for the
// full Session shape.
const aSession = { user: { id: 'u1' } } as Session

beforeEach(() => vi.clearAllMocks())

async function renderAt(route: string) {
  return renderWithProviders(<ProtectedRoute />, {
    route,
    children: [{ path: '/dashboard', element: <div>library contents</div> }],
    siblings: [{ path: '/login', element: <div>login page</div> }],
  })
}

describe('ProtectedRoute', () => {
  test('renders children when a session exists', async () => {
    api.getSession.mockResolvedValue(aSession)
    await renderAt('/dashboard')
    expect(await screen.findByText('library contents')).toBeInTheDocument()
  })

  test('redirects to /login when no session exists', async () => {
    api.getSession.mockResolvedValue(null)
    await renderAt('/dashboard')
    expect(await screen.findByText('login page')).toBeInTheDocument()
    expect(screen.queryByText('library contents')).not.toBeInTheDocument()
  })

  test('shows a sign-out control when signed in', async () => {
    api.getSession.mockResolvedValue(aSession)
    await renderAt('/dashboard')
    expect(await screen.findByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  test('signing out calls signOut', async () => {
    api.getSession.mockResolvedValue(aSession)
    api.signOut.mockResolvedValue(undefined)
    await renderAt('/dashboard')

    await userEvent.click(await screen.findByRole('button', { name: /sign out/i }))
    await waitFor(() => expect(api.signOut).toHaveBeenCalledTimes(1))
  })

  test('renders a loading state while the session is resolving', async () => {
    api.getSession.mockReturnValue(new Promise(() => {}))
    await renderAt('/dashboard')
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
  })
})
