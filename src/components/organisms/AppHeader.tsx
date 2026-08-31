import { Link } from '@tanstack/react-router'
import Button from '../atoms/Button'

interface AppHeaderProps {
  onSignOut: () => void
  signingOut?: boolean
}

const NAV =
  'border-b border-transparent pb-1 text-sm tracking-[0.09em] text-mute uppercase ' +
  'no-underline transition-colors hover:border-amber hover:text-vellum'

export default function AppHeader({ onSignOut, signingOut = false }: AppHeaderProps) {
  return (
    <header className="mx-auto flex max-w-measure items-baseline gap-gutter px-gutter pt-8">
      <nav className="mr-auto flex gap-6">
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
    </header>
  )
}
