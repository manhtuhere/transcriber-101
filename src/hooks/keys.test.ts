import { describe, expect, test } from 'vitest'
import { keys } from './keys'

describe('query keys', () => {
  /*
    A regression test for a real bug. The shelf signs many covers at once and
    caches a Record of path -> URL; a single cover caches a bare string. The
    batch key was built by joining the paths under the same 'cover' prefix, and
    joining one path yields exactly that path — so on a one-book shelf the two
    keys were identical, the detail page read the Record, and the cover rendered
    as src="[object Object]".
  */
  test('a one-path batch does not collide with that path on its own', () => {
    const path = 'b1/cover.jpg'
    expect(keys.coverBatch([path])).not.toEqual(keys.cover(path))
  })

  test('the two cover keys never share a namespace', () => {
    expect(keys.cover('x')[0]).not.toBe(keys.coverBatch(['x'])[0])
  })

  test('a batch key is stable for the same set of paths', () => {
    expect(keys.coverBatch(['a', 'b'])).toEqual(keys.coverBatch(['a', 'b']))
  })

  test('a batch key distinguishes different sets', () => {
    expect(keys.coverBatch(['a'])).not.toEqual(keys.coverBatch(['a', 'b']))
  })
})
