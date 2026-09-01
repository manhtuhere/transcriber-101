import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react'

interface DropZoneProps {
  label: string
  hint: ReactNode
  accept: string
  /** Shown in place of the hint once something has been chosen. */
  chosen?: ReactNode
  onSelect: (file: File) => void
  disabled?: boolean
}

/**
 * Choose a file by dropping it, or by clicking through to the usual picker.
 *
 * The input is a real `<input type="file">` inside a `<label>`, not a div with
 * a click handler: that keeps it in the tab order, operable with the keyboard,
 * and announced as a file control, all of which a bare drop target loses.
 * Dragging is the addition, never the only way in.
 */
export default function DropZone({
  label,
  hint,
  accept,
  chosen,
  onSelect,
  disabled = false,
}: DropZoneProps) {
  const inputId = useId()
  const [over, setOver] = useState(false)
  // Drag events fire for every child element, so a boolean flag would flicker
  // as the pointer crosses the text inside the zone. Counting enter and leave
  // keeps the highlight steady.
  const depth = useRef(0)

  function onDrop(event: DragEvent) {
    event.preventDefault()
    depth.current = 0
    setOver(false)
    if (disabled) return

    const file = event.dataTransfer.files[0]
    if (file) onSelect(file)
  }

  return (
    <label
      htmlFor={inputId}
      onDragEnter={(event) => {
        event.preventDefault()
        depth.current += 1
        setOver(true)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => {
        depth.current -= 1
        if (depth.current <= 0) setOver(false)
      }}
      onDrop={onDrop}
      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-md border
        border-dashed px-6 py-8 text-center transition-colors
        has-[:focus-visible]:border-cloth
        ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        ${over ? 'border-cloth bg-cloth/8' : 'border-edge bg-card/60 hover:bg-card'}`}
    >
      <span className="font-data text-[0.68rem] tracking-[0.1em] text-muted uppercase">
        {label}
      </span>

      {chosen ? (
        <span className="font-title text-base">{chosen}</span>
      ) : (
        <span className="text-sm text-muted">{hint}</span>
      )}

      <span className="mt-1 text-sm text-cloth underline underline-offset-2">
        {chosen ? 'Choose a different file' : 'Choose a file'}
      </span>

      <input
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onSelect(file)
          // Reset, so choosing the same file twice still fires a change.
          event.target.value = ''
        }}
        className="sr-only"
      />
    </label>
  )
}
