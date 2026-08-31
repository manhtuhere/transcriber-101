import { describe, expect, test } from 'vitest'
import { VOICE_RATES } from '../constants/voices'
import { estimateCost, estimateRuntime } from './estimate'

describe('estimateCost', () => {
  test('cost is chars / 1000 * the model rate', () => {
    // Verified against Deepgram pricing: Aura-2 is $0.030 per 1k characters.
    expect(estimateCost(500_000, 'aura-2-thalia-en').usd).toBe(15)
  })

  test('aura-1 costs half of aura-2 for the same text', () => {
    expect(estimateCost(500_000, 'aura-asteria-en').usd).toBe(7.5)
  })

  test('cost rounds to cents', () => {
    expect(estimateCost(1234, 'aura-2-thalia-en').usd).toBe(0.04)
  })

  test('zero chars costs zero', () => {
    expect(estimateCost(0, 'aura-2-thalia-en').usd).toBe(0)
  })

  test('an unknown voice falls back to the most expensive known rate', () => {
    expect(estimateCost(1000, 'made-up-voice').usd).toBe(Math.max(...Object.values(VOICE_RATES)))
  })
})

describe('estimateRuntime', () => {
  test('runtime scales with chars', () => {
    expect(estimateRuntime(100_000).seconds).toBeGreaterThan(estimateRuntime(10_000).seconds)
  })

  test('runtime accounts for the concurrency cap', () => {
    const serial = estimateRuntime(100_000, { concurrency: 1 }).seconds
    const parallel = estimateRuntime(100_000, { concurrency: 4 }).seconds
    expect(parallel).toBeLessThan(serial)
    expect(parallel).toBeCloseTo(serial / 4, 0)
  })

  test('runtime is never below a floor for a tiny book', () => {
    expect(estimateRuntime(10).seconds).toBeGreaterThan(0)
  })
})
