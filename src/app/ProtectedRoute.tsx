import { Navigate, Outlet } from '@tanstack/react-router'
import Alert from '../components/atoms/Alert'
import Spinner from '../components/atoms/Spinner'
import AppHeader from '../components/organisms/AppHeader'
import { useAuthBypass } from '../hooks/useAuthBypass'
import { useSession } from '../hooks/useSession'
import { useSignOut } from '../hooks/useSignOut'

export default function ProtectedRoute() {
  const { data: session, isPending } = useSession()
  const exit = useSignOut()
  const bypass = useAuthBypass()

  const header = <AppHeader onSignOut={() => exit.mutate()} signingOut={exit.isPending} />

  // The literal DEV check folds to false in a production build, taking the
  // banner and everything below it out of the bundle.
  if (import.meta.env.DEV && bypass.active) {
    return (
      <>
        <div className="mx-auto max-w-measure px-gutter pt-6">
          <Alert tone="warning">
            Signed out — viewing with the developer bypass, so no books will load.{' '}
            <button
              type="button"
              onClick={bypass.disable}
              className="cursor-pointer underline underline-offset-2 hover:text-vellum"
            >
              Turn it off
            </button>
          </Alert>
        </div>
        {header}
        <Outlet />
      </>
    )
  }

  if (isPending) return <Spinner />

  if (!session) return <Navigate to="/login" replace />

  return (
    <>
      {header}
      <Outlet />
    </>
  )
}
