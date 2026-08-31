// @vitest-environment jsdom
//
// The truth table below is pure, but the toggle reads and writes
// localStorage, so this file opts into a DOM rather than pretending
// otherwise. Everything else under src/**/*.test.ts still runs in node.
import { beforeEach, describe, expect, test } from 'vitest'
import {
  BYPASS_STORAGE_KEY,
  disableAuthBypass,
  enableAuthBypass,
  isAuthBypassed,
  shouldBypassAuth,
} from './devAuth'

describe('shouldBypassAuth', () => {
  test('is on in dev when the env flag is set', () => {
    expect(shouldBypassAuth({ DEV: true, VITE_AUTH_BYPASS: 'true' }, false)).toBe(true)
  })

  test('is on in dev when the button has been used, with no env flag', () => {
    expect(shouldBypassAuth({ DEV: true }, true)).toBe(true)
  })

  // The one that matters: neither route may unlock a deployed build.
  test('is off in a production build even when the env flag is set', () => {
    expect(shouldBypassAuth({ DEV: false, VITE_AUTH_BYPASS: 'true' }, false)).toBe(false)
  })

  test('is off in a production build even when storage says otherwise', () => {
    expect(shouldBypassAuth({ DEV: false }, true)).toBe(false)
  })

  test('is off in dev with neither the flag nor the button', () => {
    expect(shouldBypassAuth({ DEV: true }, false)).toBe(false)
  })

  test('is off in dev when the flag is anything but the string "true"', () => {
    expect(shouldBypassAuth({ DEV: true, VITE_AUTH_BYPASS: 'false' }, false)).toBe(false)
    expect(shouldBypassAuth({ DEV: true, VITE_AUTH_BYPASS: '1' }, false)).toBe(false)
  })
})

describe('the toggle', () => {
  beforeEach(() => localStorage.clear())

  test('is off before the button is used', () => {
    expect(isAuthBypassed()).toBe(false)
  })

  test('enable turns it on, disable turns it back off', () => {
    enableAuthBypass()
    expect(isAuthBypassed()).toBe(true)

    disableAuthBypass()
    expect(isAuthBypassed()).toBe(false)
  })

  test('survives a reload, because it lives in storage rather than memory', () => {
    enableAuthBypass()
    expect(localStorage.getItem(BYPASS_STORAGE_KEY)).toBe('true')
  })

  test('ignores a corrupt stored value rather than treating it as on', () => {
    localStorage.setItem(BYPASS_STORAGE_KEY, 'sure')
    expect(isAuthBypassed()).toBe(false)
  })
})
