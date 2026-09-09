import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { DEFAULT_CONCURRENCY } from '../../src/constants/synthesis'

const here = dirname(fileURLToPath(import.meta.url))
const source = readFileSync(resolve(here, 'synthesize.ts'), 'utf8')

/*
  How many Deepgram requests are in flight is a fact the upload form quotes and
  the worker obeys, so it has to be one number. It was two: the worker defaulted
  to 3 and `estimateRuntime` divided by 4, which made every estimate shown to a
  reader a third faster than the worker could possibly be.

  Read from source rather than exercised, because the value is a parameter
  default — calling the function with an explicit concurrency would prove
  nothing about what the worker uses when it passes none, which is what
  `worker.ts` does.
*/
describe('synthesis concurrency', () => {
  test('the worker defaults to the shared constant, not a literal', () => {
    expect(source).toContain('concurrency = DEFAULT_CONCURRENCY')
    expect(source).not.toMatch(/concurrency = \d/)
  })

  test('the constant is imported rather than redeclared', () => {
    expect(source).toMatch(
      /import \{ DEFAULT_CONCURRENCY \} from '\.\.\/\.\.\/src\/constants\/synthesis'/,
    )
  })

  // A sanity floor and ceiling. One would serialize every book; a large number
  // would trip Deepgram's rate limits rather than go faster.
  test('the shared value is a sane number of parallel requests', () => {
    expect(DEFAULT_CONCURRENCY).toBeGreaterThanOrEqual(1)
    expect(DEFAULT_CONCURRENCY).toBeLessThanOrEqual(8)
  })
})
