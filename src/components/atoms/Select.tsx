import type { SelectHTMLAttributes } from 'react'
import { INPUT_STYLE } from './TextInput'

export interface SelectOption {
  id: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: readonly SelectOption[]
}

export default function Select({ options, className = '', ...rest }: SelectProps) {
  return (
    <select className={`${INPUT_STYLE} ${className}`} {...rest}>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
