import { useState, type ReactNode } from 'react'
import Alert from '../atoms/Alert'
import Button from '../atoms/Button'
import TextInput from '../atoms/TextInput'
import BookCover from '../molecules/BookCover'
import CoverPicker from '../molecules/CoverPicker'

interface BookIdentityProps {
  title: string
  author: string | null
  chapterCount: number
  durationSec: number
  /** The stored cover, already signed. */
  coverUrl?: string
  /** Whether there is a stored cover to remove, regardless of signing. */
  hasCover: boolean
  onSave: (fields: { title: string; author: string }) => void
  onCoverSelect: (file: File) => void
  onCoverRemove: () => void
  saving?: boolean
  coverBusy?: boolean
  error?: Error | null
  /** Shown beside the cover — the Listen link, when there is one. */
  children?: ReactNode
}

/**
 * What the book is: its cover, who wrote it, and the way into both.
 *
 * Editing is a mode rather than a permanently-live form. A transcript's title
 * is guessed from its first line and is often wrong, so it has to be fixable —
 * but this page is read far more often than it is edited, and inputs sitting
 * where a heading belongs make a reference page look like a settings screen.
 *
 * The title itself is the page heading, owned by PageShell; this block edits it
 * without printing it twice.
 */
export default function BookIdentity({
  title,
  author,
  chapterCount,
  durationSec,
  coverUrl,
  hasCover,
  onSave,
  onCoverSelect,
  onCoverRemove,
  saving = false,
  coverBusy = false,
  error = null,
  children,
}: BookIdentityProps) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftAuthor, setDraftAuthor] = useState(author ?? '')

  // Seeded when the form opens rather than from an effect on the props. The
  // worker writes to this row as it converts, so a refetch can land mid-edit;
  // syncing on every change would wipe what has been typed.
  function open() {
    setDraftTitle(title)
    setDraftAuthor(author ?? '')
    setEditing(true)
  }

  return (
    <section className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <div className={editing ? 'sm:w-64 shrink-0' : 'w-40 shrink-0'}>
        {editing ? (
          <CoverPicker
            currentUrl={coverUrl}
            onSelect={(file) => {
              if (file) onCoverSelect(file)
            }}
            onRemove={hasCover ? onCoverRemove : undefined}
            busy={coverBusy}
          />
        ) : (
          <BookCover
            coverUrl={coverUrl}
            title={title}
            author={author}
            chapterCount={chapterCount}
            durationSec={durationSec}
            size="lg"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        {editing ? (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              onSave({ title: draftTitle, author: draftAuthor })
              setEditing(false)
            }}
          >
            <label className="block space-y-1.5">
              <span className="block font-data text-[0.68rem] tracking-[0.1em] text-muted uppercase">
                Title
              </span>
              <TextInput
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                required
              />
            </label>

            <label className="block space-y-1.5">
              <span className="block font-data text-[0.68rem] tracking-[0.1em] text-muted uppercase">
                Author
              </span>
              <TextInput
                value={draftAuthor}
                onChange={(event) => setDraftAuthor(event.target.value)}
              />
            </label>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving || draftTitle.trim() === ''}>
                {saving ? 'Saving…' : 'Save details'}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <>
            {author && <p className="text-lg text-muted">{author}</p>}
            {children}
            <p>
              <Button variant="bare" onClick={open}>
                Edit title, author and cover
              </Button>
            </p>
          </>
        )}

        {error && <Alert>{error.message}</Alert>}
      </div>
    </section>
  )
}
