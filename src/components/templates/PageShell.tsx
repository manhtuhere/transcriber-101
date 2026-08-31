import type { ReactNode } from 'react'

interface PageShellProps {
  title: string
  /** A narrow column for single-purpose pages such as sign-in. */
  narrow?: boolean
  /** Rendered above the heading — the dev bypass banner uses this. */
  banner?: ReactNode
  children?: ReactNode
}

/**
 * The page column, and the only place vertical rhythm is set.
 *
 * `space-y-6` on the container means a section carries no top margin of its
 * own — which is how a button ends up touching the paragraph above it when
 * someone forgets one.
 */
export default function PageShell({ title, banner, children, narrow }: PageShellProps) {
  return (
    <main
      className={`mx-auto space-y-6 px-gutter pt-12 pb-18 ${
        narrow ? 'max-w-lg pt-24' : 'max-w-measure'
      }`}
    >
      {banner}
      <h1 className={`font-light ${narrow ? 'text-3xl' : 'text-display'}`}>{title}</h1>

      {/*
        19 equals signs — this product's actual chapter delimiter, borrowed as
        the page rule. Real markup rather than CSS ::after content, because
        Chrome folds generated content into the heading's accessible name and
        screen readers would read the rule aloud.
      */}
      <div
        aria-hidden="true"
        className="overflow-hidden font-data text-sm tracking-[0.08em] whitespace-nowrap
          text-amber/45 select-none !mt-4"
      >
        ===================
      </div>

      {children}
    </main>
  )
}
