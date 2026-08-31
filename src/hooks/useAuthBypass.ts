import { useNavigate } from '@tanstack/react-router'
import { disableAuthBypass, enableAuthBypass, isAuthBypassed } from '../lib/devAuth'

/**
 * The dev sign-in bypass, as the UI needs it.
 *
 * Navigating after each toggle is what refreshes the gate: the flag is read
 * during render, so moving to another route re-reads it. No subscription, and
 * no chance of the banner disagreeing with the state it describes.
 */
export function useAuthBypass() {
  const navigate = useNavigate()

  return {
    active: isAuthBypassed(),
    enable: () => {
      enableAuthBypass()
      void navigate({ to: '/dashboard' })
    },
    disable: () => {
      disableAuthBypass()
      void navigate({ to: '/login' })
    },
  }
}
