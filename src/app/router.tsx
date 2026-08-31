import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import BookDetail from '../pages/BookDetail'
import Dashboard from '../pages/Dashboard'
import Listen from '../pages/Listen'
import Login from '../pages/Login'
import NotFound from '../pages/NotFound'
import Upload from '../pages/Upload'
import ProtectedRoute from './ProtectedRoute'

/*
  Routing is defined in code rather than by file convention.

  File-based routing would generate a `src/routes/` tree and a routeTree.gen.ts
  alongside it, both of which sit outside the atomic-design layers that
  src/test/architecture.test.ts enforces. Code-based routing keeps the whole
  tree in `app`, which is the layer that owns composition anyway.
*/

const rootRoute = createRootRoute({ component: () => <Outlet /> })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  // Redirect before render rather than mounting a component that immediately
  // navigates: no flash of an empty page.
  beforeLoad: () => {
    throw redirect({ to: '/dashboard' })
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
})

/**
 * Pathless layout route: it contributes no URL segment, only the auth gate that
 * wraps everything beneath it.
 */
const protectedLayout = createRoute({
  getParentRoute: () => rootRoute,
  id: 'protected',
  component: ProtectedRoute,
})

const dashboardRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: '/dashboard',
  component: Dashboard,
})

const uploadRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: '/upload',
  component: Upload,
})

const bookRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: '/books/$id',
  component: BookDetail,
})

const listenRoute = createRoute({
  getParentRoute: () => protectedLayout,
  path: '/books/$id/listen',
  component: Listen,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  protectedLayout.addChildren([dashboardRoute, uploadRoute, bookRoute, listenRoute]),
])

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFound,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
