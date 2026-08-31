import { Link } from '@tanstack/react-router'
import PageShell from '../components/templates/PageShell'

export default function NotFound() {
  return (
    <PageShell title="Not found">
      <p className="text-mute">That page does not exist, or the book is not yours.</p>
      <Link to="/dashboard" className="inline-block border-b border-current text-amber no-underline">
        Back to your library
      </Link>
    </PageShell>
  )
}
