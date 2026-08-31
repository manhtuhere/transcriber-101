import { describe, expect, test } from 'vitest'
import { readWorkerEnv } from './env'

const complete = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_x',
  DEEPGRAM_API_KEY: 'dg_x',
}

describe('readWorkerEnv', () => {
  test('returns the three values when all are present', () => {
    expect(readWorkerEnv(complete)).toEqual({
      supabaseUrl: 'https://example.supabase.co',
      supabaseSecretKey: 'sb_secret_x',
      deepgramApiKey: 'dg_x',
    })
  })

  test('throws when DEEPGRAM_API_KEY is missing', () => {
    expect(() => readWorkerEnv({ ...complete, DEEPGRAM_API_KEY: '' })).toThrow(
      /DEEPGRAM_API_KEY/,
    )
  })

  test('throws when the secret key is missing', () => {
    expect(() => readWorkerEnv({ ...complete, SUPABASE_SECRET_KEY: '' })).toThrow(
      /SUPABASE_SECRET_KEY/,
    )
  })

  test('names every missing variable at once, not just the first', () => {
    const error = (() => {
      try {
        readWorkerEnv({})
        return null
      } catch (e) {
        return e as Error
      }
    })()

    expect(error?.message).toMatch(/SUPABASE_URL/)
    expect(error?.message).toMatch(/SUPABASE_SECRET_KEY/)
    expect(error?.message).toMatch(/DEEPGRAM_API_KEY/)
  })

  test('warns against the VITE_ prefix, which would leak the key to the browser', () => {
    expect(() => readWorkerEnv({})).toThrow(/VITE_/)
  })
})
