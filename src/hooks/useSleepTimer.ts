import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Counts down and then calls `onExpire` — the player pauses itself.
 *
 * Holds a deadline rather than decrementing a counter: a tab that is
 * backgrounded gets its timers throttled, so counting ticks would drift and a
 * 30-minute timer could run well past thirty minutes. Comparing against a
 * wall-clock deadline is right however irregularly the interval fires.
 */
export function useSleepTimer(onExpire: () => void) {
  const [remainingSec, setRemainingSec] = useState<number | null>(null)
  const deadline = useRef<number | null>(null)

  // Kept in a ref so changing the callback does not restart the countdown.
  const expire = useRef(onExpire)
  useEffect(() => {
    expire.current = onExpire
  }, [onExpire])

  // A named boolean, not `remainingSec !== null` inline: the countdown should
  // restart the interval when it starts and stops, not on every tick.
  const running = remainingSec !== null

  useEffect(() => {
    if (!running) return

    const tick = setInterval(() => {
      if (deadline.current === null) return
      const left = Math.max(0, Math.round((deadline.current - Date.now()) / 1000))
      setRemainingSec(left)

      if (left === 0) {
        deadline.current = null
        setRemainingSec(null)
        expire.current()
      }
    }, 1000)

    return () => clearInterval(tick)
  }, [running])

  const start = useCallback((seconds: number) => {
    if (seconds <= 0) return
    deadline.current = Date.now() + seconds * 1000
    setRemainingSec(Math.round(seconds))
  }, [])

  const cancel = useCallback(() => {
    deadline.current = null
    setRemainingSec(null)
  }, [])

  return { remainingSec, active: remainingSec !== null, start, cancel }
}
