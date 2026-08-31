import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'bare'
  children: ReactNode
}

const BASE =
  'text-sm font-medium tracking-wide transition-colors cursor-pointer ' +
  'disabled:cursor-not-allowed disabled:opacity-40'

/*
  Padding belongs to the variant, not to BASE. Tailwind resolves conflicting
  utilities by stylesheet order, not by the order they appear in a className
  string, so a caller passing `px-0` cannot reliably beat a `px-6` in BASE —
  the header's quiet action is a variant instead of an override.
*/
const VARIANTS = {
  primary: 'rounded-full border border-transparent px-6 py-3 bg-amber text-ink hover:bg-amber/85',
  ghost:
    'rounded-full border border-vellum/10 px-6 py-3 bg-transparent text-mute ' +
    'hover:border-vellum/20 hover:text-vellum',
  bare: 'bg-transparent px-0 py-1 tracking-[0.09em] text-mute uppercase hover:text-vellum',
}

export default function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  return <button type={type} className={`${BASE} ${VARIANTS[variant]} ${className}`} {...rest} />
}
