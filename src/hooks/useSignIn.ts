import { useMutation } from '@tanstack/react-query'
import { signInWithOtp } from '../lib/api'

/** Send a magic link. */
export function useSignIn() {
  // Wrapped rather than passed by reference: react-query calls mutationFn with
  // (variables, context), and the api layer takes only the email.
  return useMutation<void, Error, string>({
    mutationFn: (email) => signInWithOtp(email),
  })
}
