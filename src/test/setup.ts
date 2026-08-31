import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

// jsdom implements no scrolling, and the router scrolls on navigation.
window.scrollTo = vi.fn()

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
