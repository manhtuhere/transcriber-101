import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

// jsdom implements no scrolling, and the router scrolls on navigation.
window.scrollTo = vi.fn()

/*
  jsdom implements no Media Session either. Stubbing it rather than leaving it
  undefined means the lock-screen wiring is actually exercised: without this the
  guards short-circuit and the tests would prove nothing.
*/
class StubMediaMetadata {
  title: string
  artist?: string
  album?: string
  constructor(init: { title: string; artist?: string; album?: string }) {
    this.title = init.title
    this.artist = init.artist
    this.album = init.album
  }
}
vi.stubGlobal('MediaMetadata', StubMediaMetadata)

export const mediaSessionHandlers = new Map<string, (details?: unknown) => void>()

vi.stubGlobal('navigator',
  Object.defineProperty(window.navigator, 'mediaSession', {
    configurable: true,
    value: {
      metadata: null as unknown,
      playbackState: 'none',
      setActionHandler: (action: string, handler: ((d?: unknown) => void) | null) => {
        if (handler) mediaSessionHandlers.set(action, handler)
        else mediaSessionHandlers.delete(action)
      },
      setPositionState: vi.fn(),
    },
  }),
)

// jsdom implements no media pipeline: play/pause/load are unimplemented and
// currentTime is read-only. Phase 5's player tests need all three to behave.
interface StubbedMedia {
  _stubbed?: boolean
}

if (!(HTMLMediaElement.prototype.play as unknown as StubbedMedia)._stubbed) {
  HTMLMediaElement.prototype.play = Object.assign(
    vi.fn<() => Promise<void>>(() => Promise.resolve()),
    { _stubbed: true },
  )
  HTMLMediaElement.prototype.pause = vi.fn()
  HTMLMediaElement.prototype.load = vi.fn()
}
