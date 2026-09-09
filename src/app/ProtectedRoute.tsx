import { Navigate, Outlet } from '@tanstack/react-router'
import Spinner from '../components/atoms/Spinner'
import AppHeader from '../components/organisms/AppHeader'
import { useSession } from '../hooks/useSession'
import { useSignOut } from '../hooks/useSignOut'

export default function ProtectedRoute() {
  const { data: session, isPending } = useSession()
  const exit = useSignOut()

  if (isPending) return <Spinner />

  if (!session) return <Navigate to="/login" replace />

  return (
    <>
      <AppHeader onSignOut={() => exit.mutate()} signingOut={exit.isPending} />
      <Outlet />
    </>
  )
}
