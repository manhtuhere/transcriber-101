import type { SelectHTMLAttributes } from 'react'
import { INPUT_STYLE } from './TextInput'

export interface SelectOption {
  id: string
  label: string
  /** Options sharing a group are rendered under one optgroup, in order. */
  group?: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: readonly SelectOption[]
}

export default function Select({ options, className = '', ...rest }: SelectProps) {
  const grouped = options.some((option) => option.group)

  return (
    <select className={`${INPUT_STYLE} ${className}`} {...rest}>
      {grouped
        ? [...new Set(options.map((option) => option.group))].map((group) => (
            <optgroup key={group} label={group}>
              {options
                .filter((option) => option.group === group)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
            </optgroup>
          ))
        : options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
    </select>
  )
}
