interface SpinnerProps {
  label?: string
}

export default function Spinner({ label = 'Loading…' }: SpinnerProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="mx-auto max-w-measure px-gutter py-18 font-data text-sm
        tracking-[0.08em] text-muted"
    >
      {label}
    </p>
  )
}
