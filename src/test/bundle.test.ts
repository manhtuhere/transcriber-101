import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist')
const built = existsSync(DIST)

if (!built) {
  console.warn('\n  SKIPPING bundle checks: run `npm run build` first.\n')
}

function bundleText(): string {
  const assets = join(DIST, 'assets')
  return readdirSync(assets)
    .filter((name) => name.endsWith('.js'))
    .map((name) => readFileSync(join(assets, name), 'utf8'))
    .join('\n')
}

describe.skipIf(!built)('production bundle', () => {
  // A bare "sb_secret_" grep would fail on a clean build: supabase-js ships
  // that literal in its own key-prefix check. The payload is what matters.
  test('contains no Supabase secret key value', () => {
    expect(bundleText()).not.toMatch(/sb_secret_[A-Za-z0-9_-]{10,}/)
  })

  test('contains no legacy service_role JWT', () => {
    expect(bundleText()).not.toMatch(/"role"\s*:\s*"service_role"/)
    expect(bundleText()).not.toMatch(/service_role/)
  })

  test('contains no Deepgram credential', () => {
    expect(bundleText()).not.toMatch(/Token\s+[A-Za-z0-9]{32,}/)
  })

  // The bypass branch must be compiled out, not merely unreachable.
  test('contains no trace of the dev auth bypass', () => {
    const text = bundleText()
    expect(text).not.toContain('VITE_AUTH_BYPASS')
    expect(text).not.toContain('dev:auth-bypass')
    expect(text).not.toContain('Continue without signing in')
    expect(text).not.toContain('developer bypass')
  })
})
