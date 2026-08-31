import type { BookStatus, ChapterStatus } from '../../types/book'

const LABELS: Record<BookStatus | ChapterStatus, string> = {
  draft: 'Draft',
  pending: 'Pending',
  processing: 'Processing',
  synthesizing: 'Synthesizing',
  ready: 'Ready',
  failed: 'Failed',
}

const TONES: Record<BookStatus | ChapterStatus, string> = {
  draft: 'text-mute',
  pending: 'text-mute',
  processing: 'text-vellum',
  synthesizing: 'text-vellum',
  ready: 'text-amber',
  failed: 'text-rose',
}

/** A working book pulses; a finished one is steady. */
const WORKING = ['processing', 'synthesizing']

interface StatusBadgeProps {
  status: BookStatus | ChapterStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-data text-xs tracking-[0.1em] uppercase ${TONES[status]}`}
    >
      <span
        className={`size-1.5 rounded-full bg-current ${
          WORKING.includes(status) ? 'animate-pulse motion-reduce:animate-none' : ''
        }`}
      />
      {LABELS[status]}
    </span>
  )
}
