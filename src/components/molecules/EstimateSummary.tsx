import { formatRuntime } from '../../utils/format'

interface EstimateSummaryProps {
  chapterCount: number
  totalChars: number
  usd: number
  seconds: number
}

export default function EstimateSummary({
  chapterCount,
  totalChars,
  usd,
  seconds,
}: EstimateSummaryProps) {
  return (
    <p className="text-sm text-mute">
      {chapterCount} chapters, {totalChars.toLocaleString()} characters. Estimated cost{' '}
      <strong data-testid="cost-estimate" className="font-data font-medium text-amber">
        ${usd.toFixed(2)}
      </strong>
      , synthesis takes{' '}
      <strong data-testid="runtime-estimate" className="font-data font-medium text-amber">
        {formatRuntime(seconds)}
      </strong>
      .
    </p>
  )
}
