/**
 * Dev-only escape hatch: render protected routes without signing in.
 *
 * Two ways in, both dev-only — the `VITE_AUTH_BYPASS` env flag, and a button on
 * the sign-in page that writes to localStorage so it survives a reload without
 * restarting the dev server.
 *
 * **Every call site must gate this behind a literal `import.meta.env.DEV`**, as
 * `import.meta.env.DEV && isAuthBypassed()`. Vite replaces that literal with
 * `false` at build time, so the whole branch — banner, button and all — folds
 * away and never reaches a production bundle. A bare `isAuthBypassed()` call
 * cannot fold, because a function's return value is not known at compile time,
 * and the branch would ship. `src/test/bundle.test.ts` checks the result.
 *
 * What it does NOT do: give you data. The bypass only skips the client-side
 * redirect. Supabase requests still go out unauthenticated, and RLS answers
 * them with empty results. It is for working on pages whose behaviour is
 * client-side — /upload especially, which parses the book entirely in the
 * browser — not for pretending to be signed in.
 */

export const BYPASS_STORAGE_KEY = 'dev:auth-bypass'

/** The truth table, as a pure function, so it can be tested exhaustively. */
export function shouldBypassAuth(
  env: { DEV: boolean; VITE_AUTH_BYPASS?: string },
  stored: boolean,
): boolean {
  return env.DEV && (env.VITE_AUTH_BYPASS === 'true' || stored)
}

function readStoredFlag(): boolean {
  try {
    return localStorage.getItem(BYPASS_STORAGE_KEY) === 'true'
  } catch {
    // Private windows can throw on access; treat that as "not bypassed".
    return false
  }
}

/*
  Each of these opens with a literal `import.meta.env.DEV` guard, and that shape
  matters. Vite replaces the literal with `false` when building, so the guard
  becomes `if (true) return`, everything after it is dead, and the storage key,
  the reads and the writes are all dropped from the bundle.

  Passing `import.meta.env` around as an object instead would defeat this: Vite
  inlines the whole object, so the variable names survive in the output even
  though the values are inert.
*/
export function isAuthBypassed(): boolean {
  if (!import.meta.env.DEV) return false
  return shouldBypassAuth(
    { DEV: true, VITE_AUTH_BYPASS: import.meta.env.VITE_AUTH_BYPASS },
    readStoredFlag(),
  )
}

export function enableAuthBypass(): void {
  if (!import.meta.env.DEV) return
  try {
    localStorage.setItem(BYPASS_STORAGE_KEY, 'true')
  } catch {
    // Nothing to do: without storage the bypass simply stays off.
  }
}

export function disableAuthBypass(): void {
  if (!import.meta.env.DEV) return
  try {
    localStorage.removeItem(BYPASS_STORAGE_KEY)
  } catch {
    // As above.
  }
}
