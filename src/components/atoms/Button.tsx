import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'bare'
  children: ReactNode
}

const BASE =
  'text-sm font-medium transition-colors cursor-pointer ' +
  'disabled:cursor-not-allowed disabled:opacity-40'

/*
  Padding belongs to the variant, not to BASE. Tailwind resolves conflicting
  utilities by stylesheet order, not by the order they appear in a className
  string, so a caller passing `px-0` cannot reliably beat a `px-6` in BASE —
  a quiet action is a variant instead of an override.
*/
const VARIANTS = {
  primary: 'rounded-md border border-cloth px-5 py-2.5 bg-cloth text-card hover:bg-cloth-soft',
  ghost:
    'rounded-md border border-rule px-5 py-2.5 bg-card text-ink ' +
    'hover:border-muted/50 hover:bg-linen/60',
  bare: 'bg-transparent px-0 py-1 font-normal text-muted hover:text-ink',
}

export default function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  return <button type={type} className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest} />
}
