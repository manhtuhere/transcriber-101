/**
 * FNV-1a, 32-bit. Used for change detection — "has this chapter's text moved
 * since we last paid to synthesize it" — never for security, so a fast
 * synchronous non-cryptographic hash is the right tool. `crypto.subtle` would
 * force every caller to become async for no benefit.
 */
export function hashText(text: string): string {
  let hash = 0x811c9dc5

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    // The classic FNV prime multiply, kept in 32-bit range.
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}
