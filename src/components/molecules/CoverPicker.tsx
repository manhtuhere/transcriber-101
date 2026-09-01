import { useEffect, useState } from 'react'
import { ACCEPTED_COVER_ACCEPT } from '../../constants/upload'
import { coverRejection } from '../../utils/cover-file'
import Alert from '../atoms/Alert'
import Button from '../atoms/Button'
import DropZone from './DropZone'

interface CoverPickerProps {
  /** The cover already stored, if any. */
  currentUrl?: string
  /** Called with a validated image, or null when the reader clears it. */
  onSelect: (file: File | null) => void
  onRemove?: () => void
  busy?: boolean
  error?: Error | null
}

/**
 * Choose a cover, or leave the book with its printed binding.
 *
 * The preview is the point: a cover is the one thing here you cannot judge from
 * a filename, so the chosen image is shown at the shape it will actually be
 * displayed in before anything is uploaded.
 */
export default function CoverPicker({
  currentUrl,
  onSelect,
  onRemove,
  busy = false,
  error = null,
}: CoverPickerProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [rejection, setRejection] = useState<string | null>(null)

  // An object URL pins the file in memory until it is released. The cleanup
  // closes over the preview from the render it ran in, so it releases the one
  // being replaced — which is why nothing revokes by hand below.
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  function choose(file: File) {
    const why = coverRejection(file)
    if (why) {
      setRejection(why)
      return
    }
    setRejection(null)
    setPreview(URL.createObjectURL(file))
    onSelect(file)
  }

  function clear() {
    setPreview(null)
    setRejection(null)
    onSelect(null)
    onRemove?.()
  }

  const shown = preview ?? currentUrl

  return (
    <div className="space-y-3">
      {shown ? (
        <div className="flex items-start gap-4">
          <img
            src={shown}
            alt="The cover you chose"
            className="book-block w-28 rounded-[2px_5px_5px_2px] object-cover"
            style={{ aspectRatio: '5 / 7' }}
          />
          <div className="space-y-2">
            <p className="text-sm text-muted">
              {preview ? 'This will be used as the cover.' : 'Current cover.'}
            </p>
            <Button variant="ghost" onClick={clear} disabled={busy} className="px-3.5 py-2 whitespace-nowrap">
              {busy ? 'Working…' : 'Remove cover'}
            </Button>
          </div>
        </div>
      ) : (
        <DropZone
          label="Cover (optional)"
          hint={
            <>
              Drop a JPEG, PNG or WebP here, up to 3 MB.
              <br />
              Without one, the book gets a printed binding set from its title.
            </>
          }
          accept={ACCEPTED_COVER_ACCEPT}
          onSelect={choose}
          disabled={busy}
        />
      )}

      {rejection && <Alert>{rejection}</Alert>}
      {error && <Alert>{error.message}</Alert>}
    </div>
  )
}
