import type { ReactNode } from 'react'

interface AlertProps {
  /** 'error' and 'warning' announce themselves; 'info' is polite. */
  tone?: 'error' | 'warning' | 'info'
  children: ReactNode
}

const TONES = {
  error: 'border-oxblood/40 bg-oxblood/8 text-oxblood',
  warning: 'border-ochre/45 bg-ochre/10 text-ink',
  info: 'border-rule bg-linen/60 text-ink',
}

export default function Alert({ tone = 'error', children }: AlertProps) {
  return (
    <p role="alert" className={`rounded-md border border-l-4 px-4 py-3 text-sm ${TONES[tone]}`}>
      {children}
    </p>
  )
}
