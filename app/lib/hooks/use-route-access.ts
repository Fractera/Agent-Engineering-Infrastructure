'use client'

import { useEffect, useState } from 'react'
import type { RouteMeta } from '@/lib/architecture/route-meta'
import { registerRedirectUrl } from '@/lib/runtime-urls'

// Client-side access guard for a route (STATIC-FIRST: reads identity via /api/me,
// never auth()/cookies() in a page — so the route stays statically generated).
//
// Three shapes, driven by the route's _meta.ts (see HOW-USE-AUTH.md):
//   • public                          → roles: [] and no requiresGuestRegistration → no-op.
//   • public + guest                  → requiresGuestRegistration: true → an unauthenticated
//                                        visit is upgraded to a real GUEST identity so the
//                                        visitor's work persists (cart, chat, drafts).
//   • private                         → roles: ['user', ...] → non-matching visitors are sent
//                                        to sign in (unauthorizedRedirect or the register form).
//
// DORMANT until a route both sets the meta and mounts this hook — mounting it
// nowhere yet means current behaviour is unchanged.
type AccessMeta = Pick<RouteMeta, 'roles' | 'unauthorizedRedirect' | 'requiresGuestRegistration'>

export function useRouteAccess(meta: AccessMeta): void {
  // undefined = loading; null = no session; object = signed-in identity.
  const [me, setMe] = useState<{ roles?: string[] } | null | undefined>(undefined)

  useEffect(() => {
    let alive = true
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive) setMe(d) })
      .catch(() => { if (alive) setMe(null) })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    if (me === undefined) return // still loading — do nothing
    const roles = meta.roles ?? []
    const signedIn = !!me

    // Public + guest: turn an anonymous visitor into a persistent guest. Hard
    // navigation (not fetch) — the endpoint sets the session cookie then returns here.
    if (meta.requiresGuestRegistration && !signedIn) {
      window.location.href = `/api/auth/guest?redirectUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`
      return
    }

    if (roles.length === 0) return // public — nothing to enforce

    const target = meta.unauthorizedRedirect ?? registerRedirectUrl(window.location.href, 'user')
    if (!signedIn) { window.location.href = target; return }
    const allowed = roles.some((r) => me?.roles?.includes(r))
    if (!allowed) window.location.href = target
    // meta comes from a module-level _meta.ts (stable); we intentionally depend on `me`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me])
}
