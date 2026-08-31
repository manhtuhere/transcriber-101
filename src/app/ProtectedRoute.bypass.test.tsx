import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../test/renderWithProviders'
import ProtectedRoute from './ProtectedRoute'

// The bypass is a module constant, so it is fixed for the lifetime of a module
// graph. This file covers the on state; ProtectedRoute.test.tsx covers off.
const disable = vi.fn()
vi.mock('../hooks/useAuthBypass', () => ({
  useAuthBypass: () => ({ active: true, enable: vi.fn(), disable }),
}))
vi.mock('../lib/api', () => ({ getSession: vi.fn(), signOut: vi.fn() }))
const api = vi.mocked(await import('../lib/api'))

beforeEach(() => {
  // useSession checks the real flag, not the mocked hook, so turn it on for
  // real — that is what proves getSession never fires while bypassed.
  localStorage.setItem('dev:auth-bypass', 'true')
})

async function renderAt(route: string) {
  return renderWithProviders(<ProtectedRoute />, {
    route,
    children: [{ path: '/dashboard', element: <div>library contents</div> }],
    siblings: [{ path: '/login', element: <div>login page</div> }],
  })
}

describe('ProtectedRoute with the dev bypass on', () => {
  test('renders the protected page without a session', async () => {
    await renderAt('/dashboard')
    expect(screen.getByText('library contents')).toBeInTheDocument()
    expect(screen.queryByText('login page')).not.toBeInTheDocument()
  })

  test('does not call getSession at all', async () => {
    await renderAt('/dashboard')
    expect(api.getSession).not.toHaveBeenCalled()
  })

  test('shows a visible warning so bypassed state is never mistaken for a real session', async () => {
    await renderAt('/dashboard')
    expect(screen.getByRole('alert')).toHaveTextContent(/developer bypass/i)
  })

  test('offers a way back out without editing a file', async () => {
    await renderAt('/dashboard')
    await userEvent.click(screen.getByRole('button', { name: /turn it off/i }))
    expect(disable).toHaveBeenCalledTimes(1)
  })
})
