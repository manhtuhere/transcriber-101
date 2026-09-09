/** Human-readable synthesis duration, e.g. "about 12 min". */
export function formatRuntime(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return 'under a minute'
  if (minutes < 60) return `about ${minutes} min`
  return `about ${Math.round(minutes / 6) / 10} h`
}

/** Playback duration as H:MM:SS, dropping the hour component when zero. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

/**
 * Time left, in the units a listener thinks in. "3h 12m left" answers "can I
 * finish this on the walk home?"; a raw timecode does not.
 */
export function formatRemaining(remainingSeconds: number): string {
  const left = Math.max(0, Math.round(remainingSeconds))
  if (left < 60) return 'less than a minute left'

  const hours = Math.floor(left / 3600)
  const minutes = Math.round((left % 3600) / 60)

  if (hours === 0) return `${minutes} min left`
  if (minutes === 0) return `${hours} hr left`
  return `${hours} hr ${minutes} min left`
}

/** How far through the book, 0–100, clamped. */
export function percentComplete(position: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((position / total) * 100)))
}

/**
 * How long a book is, for scanning a shelf. "3 hr 14 min" answers a different
 * question from "3:14:00" — the timecode is for navigating inside a book, this
 * is for choosing one.
 */
export function formatLength(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.round((safe % 3600) / 60)

  if (hours === 0) return `${Math.max(minutes, 1)} min`
  if (minutes === 0) return `${hours} hr`
  return `${hours} hr ${minutes} min`
}
