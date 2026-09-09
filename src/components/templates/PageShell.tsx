import type { ReactNode } from 'react'

interface PageShellProps {
  title: string
  /** One line under the title saying what this page is for. */
  lede?: ReactNode
  /** A narrow column for single-purpose pages such as sign-in. */
  narrow?: boolean
  /** Rendered above the heading — the dev banner uses this. */
  banner?: ReactNode
  children?: ReactNode
}

/**
 * The page column, and the only place vertical rhythm is set.
 *
 * `space-y-8` on the container means a section carries no top margin of its
 * own — which is how a button ends up touching the paragraph above it when
 * someone forgets one.
 */
export default function PageShell({ title, lede, banner, children, narrow }: PageShellProps) {
  return (
    <main
      className={`mx-auto space-y-8 px-gutter pt-10 pb-20 ${
        narrow ? 'max-w-md pt-20' : 'max-w-measure'
      }`}
    >
      {banner}

      <header className="space-y-3">
        <h1 className={`font-normal ${narrow ? 'text-3xl' : 'text-display'}`}>{title}</h1>

        {/*
          19 equals signs — this product's actual chapter delimiter, borrowed as
          the page rule. Real markup rather than CSS ::after content, because
          Chrome folds generated content into the heading's accessible name and
          screen readers would read the rule aloud.
        */}
        <div
          aria-hidden="true"
          className="overflow-hidden font-data text-sm tracking-[0.08em] whitespace-nowrap
            text-ochre/55 select-none"
        >
          ===================
        </div>

        {lede && <p className="max-w-[52ch] text-muted">{lede}</p>}
      </header>

      {children}
    </main>
  )
}
