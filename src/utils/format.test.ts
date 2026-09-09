import { describe, expect, test } from 'vitest'
import {
  formatDuration,
  formatLength,
  formatRemaining,
  formatRuntime,
  percentComplete,
} from './format'

describe('formatDuration', () => {
  test('formats sub-hour durations without an hour component', () => {
    expect(formatDuration(125)).toBe('2:05')
  })

  test('formats hours, zero-padding minutes and seconds', () => {
    expect(formatDuration(7325)).toBe('2:02:05')
  })

  test('formats zero', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  test('floors fractional seconds', () => {
    expect(formatDuration(59.9)).toBe('0:59')
  })

  test('clamps a negative position to zero', () => {
    expect(formatDuration(-10)).toBe('0:00')
  })

  test('crosses the hour boundary correctly', () => {
    expect(formatDuration(3599)).toBe('59:59')
    expect(formatDuration(3600)).toBe('1:00:00')
  })
})

describe('formatRuntime', () => {
  test('reads "under a minute" below the threshold', () => {
    expect(formatRuntime(20)).toBe('under a minute')
  })

  test('reads in minutes below an hour', () => {
    expect(formatRuntime(600)).toBe('about 10 min')
  })

  test('reads in hours above an hour', () => {
    expect(formatRuntime(7200)).toMatch(/^about 2(\.0)? h$/)
  })
})

describe('formatRemaining', () => {
  test('reads in minutes under an hour', () => {
    expect(formatRemaining(720)).toBe('12 min left')
  })

  test('reads in hours and minutes over an hour', () => {
    expect(formatRemaining(11_520)).toBe('3 hr 12 min left')
  })

  test('drops the minutes when they round to zero', () => {
    expect(formatRemaining(7200)).toBe('2 hr left')
  })

  test('has a floor so a nearly-finished book does not read "0 min left"', () => {
    expect(formatRemaining(20)).toBe('less than a minute left')
  })

  test('never reads negative when the saved position overshoots', () => {
    expect(formatRemaining(-50)).toBe('less than a minute left')
  })
})

describe('percentComplete', () => {
  test('reports progress as a rounded percentage', () => {
    expect(percentComplete(30, 120)).toBe(25)
  })

  test('is 0 at the start', () => {
    expect(percentComplete(0, 120)).toBe(0)
  })

  test('clamps past the end', () => {
    expect(percentComplete(500, 120)).toBe(100)
  })

  test('is 0 for a book with no known duration, rather than NaN', () => {
    expect(percentComplete(30, 0)).toBe(0)
  })
})

describe('formatLength', () => {
  test('reads in hours and minutes', () => {
    expect(formatLength(7325)).toBe('2 hr 2 min')
  })

  test('reads in minutes under an hour', () => {
    expect(formatLength(2820)).toBe('47 min')
  })

  test('drops minutes when they round away', () => {
    expect(formatLength(10_800)).toBe('3 hr')
  })

  test('never reads "0 min" for a very short book', () => {
    expect(formatLength(12)).toBe('1 min')
  })
})
