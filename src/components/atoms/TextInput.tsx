import type { InputHTMLAttributes } from 'react'

type TextInputProps = InputHTMLAttributes<HTMLInputElement>

export const INPUT_STYLE =
  'w-full max-w-104 rounded-md border border-edge bg-card px-3.5 py-2.5 ' +
  'text-base text-ink transition-colors placeholder:text-muted/70 ' +
  'hover:border-ink/40 focus:border-cloth'

export default function TextInput({ className = '', ...props }: TextInputProps) {
  return <input className={`${INPUT_STYLE} ${className}`} {...props} />
}
