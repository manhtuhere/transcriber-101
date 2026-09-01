import type { ShelfStats } from '../../utils/shelf'
import { formatLength } from '../../utils/format'

interface ShelfSummaryProps {
  stats: ShelfStats
}

/**
 * What the shelf adds up to, under the page title.
 *
 * Facts rather than filler: how much is here, how long it runs, and whether
 * anything is still converting — which is the one thing that changes on its own
 * and so the one thing worth surfacing before the shelf itself.
 */
export default function ShelfSummary({ stats }: ShelfSummaryProps) {
  if (stats.total === 0) return null

  const entries = [
    { label: stats.total === 1 ? 'book' : 'books', value: String(stats.total) },
    { label: 'of listening', value: formatLength(stats.totalSeconds) },
    ...(stats.processing > 0
      ? [{ label: 'still converting', value: String(stats.processing), live: true }]
      : []),
  ]

  return (
    <dl className="flex flex-wrap items-baseline gap-x-7 gap-y-2">
      {entries.map((entry) => (
        <div key={entry.label} className="flex items-baseline gap-1.5">
          <dt className="sr-only">{entry.label}</dt>
          <dd
            className={`font-data text-lg ${entry.live ? 'text-ochre' : 'text-ink'}`}
            aria-hidden="true"
          >
            {entry.value}
          </dd>
          <span className="text-sm text-muted">{entry.label}</span>
        </div>
      ))}
    </dl>
  )
}
