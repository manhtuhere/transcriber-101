import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { renderWithProviders } from '../test/renderWithProviders'
import Login from './Login'

const devSignIn = vi.fn()
vi.mock('../hooks/useDevSignIn', () => ({
  useDevSignIn: () => ({ mutate: devSignIn, isPending: false, error: null }),
}))

vi.mock('../lib/api', () => ({ signInWithOtp: vi.fn() }))
const api = vi.mocked(await import('../lib/api'))

beforeEach(() => {
  vi.clearAllMocks()
  api.signInWithOtp.mockResolvedValue(undefined)
})

describe('Login', () => {
  test('renders email field and submit button', async () => {
    await renderWithProviders(<Login />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  test('submitting a valid email calls signInWithOtp once with that email', async () => {
    await renderWithProviders(<Login />)
    await userEvent.type(screen.getByLabelText(/email/i), 'reader@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    await waitFor(() => expect(api.signInWithOtp).toHaveBeenCalledTimes(1))
    expect(api.signInWithOtp).toHaveBeenCalledWith('reader@example.com')
  })

  test('shows "check your email" confirmation after a successful send', async () => {
    await renderWithProviders(<Login />)
    await userEvent.type(screen.getByLabelText(/email/i), 'reader@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument()
  })

  test('shows the error message when signInWithOtp rejects', async () => {
    api.signInWithOtp.mockRejectedValue(new Error('rate limit exceeded'))
    await renderWithProviders(<Login />)
    await userEvent.type(screen.getByLabelText(/email/i), 'reader@example.com')
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/rate limit exceeded/i)
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument()
  })

  // The panel is dev-only; the tests run with import.meta.env.DEV true.
  test('offers a developer sign-in that skips the email round trip', async () => {
    await renderWithProviders(<Login />)
    expect(screen.getByRole('button', { name: /sign in as developer/i })).toBeInTheDocument()
  })

  test('the developer button signs in for real, rather than faking a session', async () => {
    await renderWithProviders(<Login />)
    await userEvent.click(screen.getByRole('button', { name: /sign in as developer/i }))
    expect(devSignIn).toHaveBeenCalledTimes(1)
  })

  test('does not call signInWithOtp when the email field is empty', async () => {
    await renderWithProviders(<Login />)
    await userEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(api.signInWithOtp).not.toHaveBeenCalled()
  })
})
