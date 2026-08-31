import type { ReactNode } from 'react'

interface AlertProps {
  /** 'error' and 'warning' announce themselves; 'info' is polite. */
  tone?: 'error' | 'warning' | 'info'
  children: ReactNode
}

const TONES = {
  error: 'border-rose bg-rose/10',
  warning: 'border-amber bg-amber/10',
  info: 'border-mute bg-mute/10',
}

export default function Alert({ tone = 'error', children }: AlertProps) {
  return (
    <p role="alert" className={`rounded-[10px] border-l-[3px] px-4 py-3 text-sm ${TONES[tone]}`}>
      {children}
    </p>
  )
}
