import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import 'dotenv/config'
import { STORAGE_STATE } from './paths'

/**
 * Creates (or reuses) the Playwright test user and saves a signed-in session as
 * storageState. Runs as its own project so the signed-out specs, which need no
 * secret key, can run without it.
 */
setup('authenticate', async () => {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY, E2E_TEST_EMAIL, E2E_TEST_PASSWORD } = process.env

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY || !E2E_TEST_EMAIL || !E2E_TEST_PASSWORD) {
    throw new Error(
      'Authenticated e2e tests need SUPABASE_URL, SUPABASE_SECRET_KEY, E2E_TEST_EMAIL and ' +
        'E2E_TEST_PASSWORD in .env. Get the secret key from the Supabase dashboard ' +
        '(Project Settings → API Keys), or run the signed-out specs only: ' +
        'npx playwright test --project=anon',
    )
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // email_confirm matters: an unconfirmed user cannot signInWithPassword, and
  // the failure reads as a wrong password rather than a missing flag.
  const { error } = await admin.auth.admin.createUser({
    email: E2E_TEST_EMAIL,
    password: E2E_TEST_PASSWORD,
    email_confirm: true,
  })
  // A repeat run finds the user already there; anything else is real.
  if (error && !/already been registered|already exists/i.test(error.message)) throw error

  const anon = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!)
  const { data, error: signInError } = await anon.auth.signInWithPassword({
    email: E2E_TEST_EMAIL,
    password: E2E_TEST_PASSWORD,
  })
  if (signInError) throw signInError

  // supabase-js persists the session under this localStorage key; seeding it
  // directly is what lets Playwright start already signed in.
  const ref = new URL(SUPABASE_URL).hostname.split('.')[0]

  await mkdir(dirname(STORAGE_STATE), { recursive: true })
  await writeFile(
    STORAGE_STATE,
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
          localStorage: [
            { name: `sb-${ref}-auth-token`, value: JSON.stringify(data.session) },
          ],
        },
      ],
    }),
  )
})
