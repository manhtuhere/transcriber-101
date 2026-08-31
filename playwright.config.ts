import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'
import { STORAGE_STATE } from './e2e/paths'

const PORT = 5173
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      // Signed-out behaviour. No secret key needed, so it runs anywhere.
      name: 'anon',
      testMatch: /.*\.anon\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      // Everything else runs as the seeded test user.
      name: 'chromium',
      testIgnore: /(.*\.anon\.spec\.ts|auth\.setup\.ts)/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    // Forced off, not inherited: the signed-out specs assert that /dashboard
    // redirects to /login, which is exactly what the bypass disables. Without
    // this, a developer's local VITE_AUTH_BYPASS=true would fail the suite in a
    // way that looks like a broken redirect.
    env: { VITE_AUTH_BYPASS: 'false' },
  },
})
