import { writable, derived } from 'svelte/store'

// ── Route definitions ─────────────────────────────────────────────────────────

export type Route = 'feed' | 'discover' | 'upload' | 'profile' | 'settings' | 'login'

const VALID_ROUTES: Route[] = ['feed', 'discover', 'upload', 'profile', 'settings', 'login']

function parseHash(): Route {
  const hash = window.location.hash.replace('#', '').split('/')[0]
  return (VALID_ROUTES.includes(hash as Route) ? hash : 'feed') as Route
}

// ── Stores ────────────────────────────────────────────────────────────────────

export const currentRoute = writable<Route>(parseHash())

// Optional: pubkey param for viewing other profiles
export const routeParam = writable<string | null>(null)

// Update store on browser back/forward
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.replace('#', '')
  const [route, param] = hash.split('/')
  const validRoute = (VALID_ROUTES.includes(route as Route) ? route : 'feed') as Route
  currentRoute.set(validRoute)
  routeParam.set(param ?? null)
})

// ── Navigation ────────────────────────────────────────────────────────────────

export function navigate(route: Route, param?: string): void {
  const hash = param ? `#${route}/${param}` : `#${route}`
  window.location.hash = hash
  currentRoute.set(route)
  routeParam.set(param ?? null)
}

// Derived: is this the active route? Used by NavBar for active state
export function isActive(route: Route) {
  return derived(currentRoute, $route => $route === route)
}
