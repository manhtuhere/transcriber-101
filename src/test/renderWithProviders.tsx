import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type AnyRoute,
  type AnyRouter,
} from '@tanstack/react-router'
import { act, render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'

export interface StubRoute {
  path: string
  element: ReactElement
}

interface Options {
  /** Initial location, e.g. '/books/abc/listen'. */
  route?: string
  /** Route pattern for `ui`, e.g. '/books/$id/listen'. Defaults to `route`. */
  path?: string
  /**
   * Render `ui` as a pathless layout wrapping these routes, for testing a
   * layout component such as ProtectedRoute in place of the page it guards.
   */
  children?: StubRoute[]
  /** Extra top-level routes, e.g. a stub '/login' to be redirected to. */
  siblings?: StubRoute[]
}

/**
 * Render a component inside the providers the app depends on.
 *
 * A real TanStack router is built per test over an in-memory history, so links
 * resolve to real hrefs and navigation actually happens — the same machinery
 * the app runs on rather than a stub.
 *
 * The route tree here is deliberately not the app's, so its types cannot match
 * the globally registered router. `AnyRoute`/`AnyRouter` are TanStack's own
 * escape hatch for exactly this case; the alternative is duplicating the real
 * tree in every test.
 *
 * Retries are off so a rejected query surfaces as an error state immediately
 * instead of after three silent attempts.
 *
 * Async because the router is: TanStack resolves the initial match off the
 * first tick, so a synchronous render would hand back an empty container and
 * every assertion would race it.
 */
export async function renderWithProviders(
  ui: ReactElement,
  { route = '/', path, children, siblings = [] }: Options = {},
): Promise<RenderResult> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const rootRoute = createRootRoute({ component: () => <Outlet /> })

  const stubsOf = (parent: AnyRoute, routes: StubRoute[]): AnyRoute[] =>
    routes.map((item) =>
      createRoute({
        getParentRoute: () => parent,
        path: item.path,
        component: () => item.element,
      }),
    )

  let subject: AnyRoute

  if (children) {
    const layout: AnyRoute = createRoute({
      getParentRoute: () => rootRoute,
      id: 'layout',
      component: () => ui,
    })
    layout.addChildren(stubsOf(layout, children))
    subject = layout
  } else {
    subject = createRoute({
      getParentRoute: () => rootRoute,
      path: path ?? route,
      component: () => ui,
    })
  }

  const router = createRouter({
    routeTree: rootRoute.addChildren([subject, ...stubsOf(rootRoute, siblings)]),
    history: createMemoryHistory({ initialEntries: [route] }),
  })

  await router.load()

  let result!: RenderResult
  await act(async () => {
    result = render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router as AnyRouter} />
      </QueryClientProvider>,
    )
  })
  return result
}
