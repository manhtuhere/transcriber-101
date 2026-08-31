import { describe, expect, test } from 'vitest'
import { readDevCredentials } from './devAuth'

const both = { VITE_DEV_EMAIL: 'dev@local', VITE_DEV_PASSWORD: 'secret' }

describe('readDevCredentials', () => {
  test('returns the account when dev mode and both values are set', () => {
    expect(readDevCredentials({ DEV: true, ...both })).toEqual({
      email: 'dev@local',
      password: 'secret',
    })
  })

  // The one that matters: a production build must never hand back credentials,
  // however the environment is configured.
  test('returns null in a production build even with both values set', () => {
    expect(readDevCredentials({ DEV: false, ...both })).toBeNull()
  })

  test('returns null when the email is missing', () => {
    expect(readDevCredentials({ DEV: true, VITE_DEV_PASSWORD: 'secret' })).toBeNull()
  })

  test('returns null when the password is missing', () => {
    expect(readDevCredentials({ DEV: true, VITE_DEV_EMAIL: 'dev@local' })).toBeNull()
  })

  test('returns null when neither is configured, so the button can explain itself', () => {
    expect(readDevCredentials({ DEV: true })).toBeNull()
  })

  test('treats an empty string as unset', () => {
    expect(readDevCredentials({ DEV: true, VITE_DEV_EMAIL: '', VITE_DEV_PASSWORD: 'x' })).toBeNull()
  })
})
