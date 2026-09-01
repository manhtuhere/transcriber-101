import { useState } from 'react'
import Alert from '../atoms/Alert'
import Button from '../atoms/Button'

interface DangerZoneProps {
  title: string
  onDelete: () => void
  deleting?: boolean
  error?: Error | null
}

/**
 * Deleting a book also deletes audio that cost money to make, so the action
 * asks once before it happens rather than offering an undo that does not exist.
 */
export default function DangerZone({
  title,
  onDelete,
  deleting = false,
  error = null,
}: DangerZoneProps) {
  const [confirming, setConfirming] = useState(false)

  return (
    <section className="space-y-4 border-t border-rule pt-6">
      {error && <Alert>{error.message}</Alert>}

      {confirming ? (
        <>
          <p className="text-sm text-muted">
            Delete <strong className="font-medium text-ink">{title}</strong>, its chapters and
            its audio? Re-creating it means paying for synthesis again.
          </p>
          <div className="flex gap-3">
            <Button onClick={onDelete} disabled={deleting} className="bg-oxblood border-oxblood hover:bg-oxblood/85">
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={deleting}>
              Keep it
            </Button>
          </div>
        </>
      ) : (
        <Button variant="bare" onClick={() => setConfirming(true)}>
          Delete this book
        </Button>
      )}
    </section>
  )
}
