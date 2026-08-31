import { useEffect, useRef } from 'react'

interface MediaSessionOptions {
  title: string
  author: string | null
  playing: boolean
  /** Whole-book position and length, so the OS shows progress through the book. */
  bookPosition: number
  bookDuration: number
  speed: number
  onPlay: () => void
  onPause: () => void
  onSkipBack: () => void
  onSkipForward: () => void
  onPreviousChapter: () => void
  onNextChapter: () => void
  onSeekTo: (bookSeconds: number) => void
}

/**
 * Lock-screen and headphone controls.
 *
 * The position reported is the position in the *book*, not in the chapter file
 * the audio element happens to be playing — otherwise the OS scrub bar would
 * reset at every chapter and show a two-minute book.
 *
 * Every call is guarded: `mediaSession` is missing in jsdom and in older
 * browsers, and `setPositionState` throws if handed a duration of zero or a
 * position beyond it.
 */
export function useMediaSession(options: MediaSessionOptions) {
  const {
    title,
    author,
    playing,
    bookPosition,
    bookDuration,
    speed,
  } = options

  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: author ?? undefined,
      album: 'Transcriber',
    })
  }, [title, author])

  /*
    The callbacks are rebuilt on every render, and `timeupdate` re-renders
    several times a second during playback. Depending on them directly would
    tear down and re-register all seven handlers at that rate, and a handler
    captured between renders could hold a stale position. Keeping them in a ref
    registers once and always reads the current values.
  */
  const latest = useRef(options)
  useEffect(() => {
    latest.current = options
  })

  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => latest.current.onPlay()],
      ['pause', () => latest.current.onPause()],
      ['seekbackward', () => latest.current.onSkipBack()],
      ['seekforward', () => latest.current.onSkipForward()],
      ['previoustrack', () => latest.current.onPreviousChapter()],
      ['nexttrack', () => latest.current.onNextChapter()],
      ['seekto', (details) => {
        if (details.seekTime !== undefined) latest.current.onSeekTo(details.seekTime)
      }],
    ]

    for (const [action, handler] of handlers) {
      // Not every browser supports every action; an unsupported one throws.
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        // Nothing to do — that control simply will not appear.
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null)
        } catch {
          // As above.
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'

    if (bookDuration > 0 && bookPosition <= bookDuration) {
      try {
        navigator.mediaSession.setPositionState({
          duration: bookDuration,
          position: bookPosition,
          playbackRate: speed,
        })
      } catch {
        // Some engines reject rates or positions they dislike; the controls
        // still work without a scrub bar.
      }
    }
  }, [playing, bookPosition, bookDuration, speed])
}
