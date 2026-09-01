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
  draft: 'border-rule bg-linen/70 text-muted',
  pending: 'border-rule bg-linen/70 text-muted',
  processing: 'border-ochre/40 bg-ochre/10 text-ochre',
  synthesizing: 'border-ochre/40 bg-ochre/10 text-ochre',
  ready: 'border-cloth/30 bg-cloth/8 text-cloth',
  failed: 'border-oxblood/35 bg-oxblood/8 text-oxblood',
}

/** A working book pulses; a finished one is steady. */
const WORKING = ['processing', 'synthesizing']

interface StatusBadgeProps {
  status: BookStatus | ChapterStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5
        font-data text-[0.65rem] tracking-[0.08em] uppercase ${TONES[status]}`}
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
