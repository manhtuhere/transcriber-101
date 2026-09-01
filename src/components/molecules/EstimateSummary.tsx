import { formatRuntime } from '../../utils/format'

interface EstimateSummaryProps {
  chapterCount: number
  totalChars: number
  usd: number
  seconds: number
}

/** What queueing this book will cost and take, before anything is written. */
export default function EstimateSummary({
  chapterCount,
  totalChars,
  usd,
  seconds,
}: EstimateSummaryProps) {
  const items = [
    { label: 'Chapters', value: String(chapterCount) },
    { label: 'Characters', value: totalChars.toLocaleString() },
    { label: 'Cost to convert', value: `$${usd.toFixed(2)}`, testid: 'cost-estimate', lead: true },
    { label: 'Takes about', value: formatRuntime(seconds), testid: 'runtime-estimate' },
  ]

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-rule
      bg-rule sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-card px-4 py-3">
          <dt className="font-data text-[0.62rem] tracking-[0.1em] text-muted uppercase">
            {item.label}
          </dt>
          <dd
            data-testid={item.testid}
            className={`mt-1 font-data text-base ${item.lead ? 'text-ochre' : 'text-ink'}`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
