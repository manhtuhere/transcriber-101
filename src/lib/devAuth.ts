/**
 * Dev-only shortcut past the magic link: sign in to a local account with a
 * password, in one click.
 *
 * This replaces an earlier "pretend to be signed in" bypass that rendered the
 * app with **no** session. That version could read nothing (RLS returns no
 * rows without a session) and, worse, let you reach Save & queue and press a
 * button that could never succeed — the insert failed
 * `with check (owner_id = auth.uid())` with a raw `42501`, because `auth.uid()`
 * was null. A real session makes RLS behave in dev exactly as it does in
 * production, which is the only version worth testing against.
 *
 * **Every call site must gate this behind a literal `import.meta.env.DEV`.**
 * Vite replaces that literal with `false` at build time, so the branch folds
 * and the button, the credentials and this module never reach production. A
 * bare function call cannot fold, because a return value is not known at
 * compile time. Never pass `import.meta.env` around as an object either: Vite
 * inlines the whole thing and the variable names survive even when the values
 * are inert. `src/test/bundle.test.ts` checks the built output.
 */

export interface DevCredentials {
  email: string
  password: string
}

/** The truth table, as a pure function, so it can be tested exhaustively. */
export function readDevCredentials(env: {
  DEV: boolean
  VITE_DEV_EMAIL?: string
  VITE_DEV_PASSWORD?: string
}): DevCredentials | null {
  if (!env.DEV) return null
  if (!env.VITE_DEV_EMAIL || !env.VITE_DEV_PASSWORD) return null
  return { email: env.VITE_DEV_EMAIL, password: env.VITE_DEV_PASSWORD }
}

/** The dev account, or null when the machine has not configured one. */
export function devCredentials(): DevCredentials | null {
  // Guard first, so the values are never inlined into a production build.
  if (!import.meta.env.DEV) return null
  return readDevCredentials({
    DEV: true,
    VITE_DEV_EMAIL: import.meta.env.VITE_DEV_EMAIL,
    VITE_DEV_PASSWORD: import.meta.env.VITE_DEV_PASSWORD,
  })
}
