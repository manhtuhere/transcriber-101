import { ACCEPTED_COVER_TYPES, MAX_COVER_BYTES } from '../constants/upload'

/**
 * Why a chosen cover cannot be used, or null when it can.
 *
 * Returns the sentence shown to the reader rather than a code: there are only
 * two ways to fail, and both are worth saying plainly at the point of choosing.
 */
export function coverRejection(file: File): string | null {
  if (!ACCEPTED_COVER_TYPES.includes(file.type)) {
    return 'That image format is not supported. Use a JPEG, PNG or WebP.'
  }
  if (file.size > MAX_COVER_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return `That image is ${mb} MB, over the ${MAX_COVER_BYTES / 1024 / 1024} MB limit.`
  }
  return null
}

/** Storage path for a book's cover, keeping the extension the browser gave us. */
export function coverPath(bookId: string, file: File): string {
  const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  return `${bookId}/cover.${extension}`
}
