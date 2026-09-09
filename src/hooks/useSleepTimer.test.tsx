import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useSleepTimer } from './useSleepTimer'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useSleepTimer', () => {
  test('is idle until started', () => {
    const { result } = renderHook(() => useSleepTimer(vi.fn()))

    expect(result.current.active).toBe(false)
    expect(result.current.remainingSec).toBeNull()
  })

  test('counts down from the time given', () => {
    const { result } = renderHook(() => useSleepTimer(vi.fn()))

    act(() => result.current.start(60))
    expect(result.current.remainingSec).toBe(60)

    act(() => vi.advanceTimersByTime(10_000))
    expect(result.current.remainingSec).toBe(50)
  })

  test('pauses playback when it reaches zero', () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() => useSleepTimer(onExpire))

    act(() => result.current.start(5))
    expect(onExpire).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(5_000))
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  test('clears itself once it has fired, rather than firing again', () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() => useSleepTimer(onExpire))

    act(() => result.current.start(2))
    act(() => vi.advanceTimersByTime(10_000))

    expect(result.current.active).toBe(false)
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  test('cancelling stops it firing', () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() => useSleepTimer(onExpire))

    act(() => result.current.start(60))
    act(() => result.current.cancel())
    act(() => vi.advanceTimersByTime(120_000))

    expect(result.current.active).toBe(false)
    expect(onExpire).not.toHaveBeenCalled()
  })

  /*
    A backgrounded tab has its timers throttled, so an interval that fired
    once a second may fire far less often. Counting ticks would overshoot; the
    hook compares against a wall-clock deadline instead.
  */
  test('expires on wall-clock time even when the interval is throttled', () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() => useSleepTimer(onExpire))

    act(() => result.current.start(30))

    // One very late tick, as a throttled tab would produce.
    act(() => vi.advanceTimersByTime(45_000))

    expect(onExpire).toHaveBeenCalledTimes(1)
    expect(result.current.remainingSec).toBeNull()
  })

  test('ignores a zero or negative duration', () => {
    const { result } = renderHook(() => useSleepTimer(vi.fn()))

    act(() => result.current.start(0))
    expect(result.current.active).toBe(false)
  })

  test('starting again replaces the running timer', () => {
    const { result } = renderHook(() => useSleepTimer(vi.fn()))

    act(() => result.current.start(60))
    act(() => vi.advanceTimersByTime(30_000))
    act(() => result.current.start(600))

    expect(result.current.remainingSec).toBe(600)
  })
})
