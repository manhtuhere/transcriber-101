import { Link } from '@tanstack/react-router'
import PageShell from '../components/templates/PageShell'

export default function NotFound() {
  return (
    <PageShell title="Not found" narrow>
      <p className="text-muted">
        That page does not exist, or the book is not yours.
      </p>
      <Link
        to="/dashboard"
        className="inline-block rounded-md border border-cloth bg-cloth px-5 py-2.5 text-sm
          font-medium text-card no-underline transition-colors hover:bg-cloth-soft"
      >
        Back to your library
      </Link>
    </PageShell>
  )
}
