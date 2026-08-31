import { useEffect, useRef } from 'react'

export type ShortcutMap = Record<string, () => void>

/** Typing in one of these must never trigger a shortcut. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true

  // `isContentEditable` covers inheritance but jsdom does not implement it, so
  // it always reads false there. The selector catches both: it walks ancestors
  // the same way, and works in every environment.
  if (target.isContentEditable) return true
  return target.closest('[contenteditable]:not([contenteditable="false"])') !== null
}

/**
 * Bind single-key shortcuts to the document.
 *
 * Keys are matched case-insensitively against `event.key`, so ' ' is the space
 * bar and 'arrowleft' the left arrow.
 *
 * Two guards carry the weight. A keypress inside a text field belongs to the
 * field — otherwise typing "Walden" in the search box would skip and pause.
 * And any press carrying a modifier belongs to the browser or the OS, so
 * Cmd-L stays "focus the address bar" rather than becoming "skip forward".
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap, enabled = true) {
  // Held in a ref so re-rendering — which playback does several times a second
  // — does not detach and reattach the listener.
  const latest = useRef(shortcuts)
  useEffect(() => {
    latest.current = shortcuts
  })

  useEffect(() => {
    if (!enabled) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (isTyping(event.target)) return

      const handler = latest.current[event.key.toLowerCase()]
      if (!handler) return

      // Space scrolls the page and the arrows move the caret; a bound key is
      // ours.
      event.preventDefault()
      handler()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
