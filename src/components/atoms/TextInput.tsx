import type { InputHTMLAttributes } from 'react'

type TextInputProps = InputHTMLAttributes<HTMLInputElement>

export const INPUT_STYLE =
  'w-full max-w-104 rounded-[10px] border border-vellum/10 bg-surface px-4 py-3 ' +
  'text-base text-vellum transition-colors hover:border-vellum/20'

export default function TextInput({ className = '', ...props }: TextInputProps) {
  return <input className={`${INPUT_STYLE} ${className}`} {...props} />
}
