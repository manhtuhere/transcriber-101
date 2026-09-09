import type { ReactNode } from 'react'

interface FormFieldProps {
  /** Must match the `id` of the control passed as children. */
  htmlFor: string
  label: string
  children: ReactNode
  /** Lay the label beside the control instead of above it. */
  inline?: boolean
}

/** A labelled control. The label/control pairing lives here so no page has to
 *  remember to wire `htmlFor` to `id` by hand. */
export default function FormField({ htmlFor, label, children, inline }: FormFieldProps) {
  return (
    <div className={inline ? 'flex items-center gap-2.5' : 'flex flex-col gap-1.5'}>
      <label
        htmlFor={htmlFor}
        className="font-data text-[0.68rem] tracking-[0.1em] text-muted uppercase"
      >
        {label}
      </label>
      {children}
    </div>
  )
}
