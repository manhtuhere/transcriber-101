import { Link } from '@tanstack/react-router'
import Button from '../atoms/Button'

interface AppHeaderProps {
  onSignOut: () => void
  signingOut?: boolean
}

const NAV =
  'border-b-2 border-transparent pb-0.5 text-sm text-muted no-underline ' +
  'transition-colors hover:border-ochre hover:text-ink'

export default function AppHeader({ onSignOut, signingOut = false }: AppHeaderProps) {
  return (
    <header className="border-b border-rule bg-card/70">
      <div className="mx-auto flex max-w-measure items-center gap-6 px-gutter py-4">
        <Link
          to="/dashboard"
          className="font-title mr-auto flex items-center gap-2.5 text-lg no-underline"
        >
          {/* An open book, closed at the spine — the product in one mark. */}
          <svg viewBox="0 0 24 20" aria-hidden="true" className="h-4 w-5 fill-cloth">
            <path d="M0 1h9a3 3 0 0 1 3 3v15a3 3 0 0 0-3-3H0zM24 1h-9a3 3 0 0 0-3 3v15a3 3 0 0 1 3-3h9z" />
          </svg>
          Transcriber
        </Link>

        <nav className="flex gap-5">
          <Link to="/dashboard" className={NAV}>
            Library
          </Link>
          <Link to="/upload" className={NAV}>
            Add a book
          </Link>
        </nav>

        <Button variant="bare" onClick={onSignOut} disabled={signingOut}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
