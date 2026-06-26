'use client'

// Client route guard. Reads '/api/me' and gates access; keeps the page static (the
// guard is a thin client overlay). Recipe: HOW-USE-AUTH.md.
//   public       : roles=[] && !requireGuest  -> renders children
//   public+guest : requireGuest               -> an anonymous visitor becomes a guest
//   private      : roles=[...]                 -> wrong role -> access-denied toast + soft redirect
// Enforced in secure mode only (in IP/dev mode auth is bypassed, so the gate is open).
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { registerRedirectUrl } from '@/lib/runtime-urls'
import { showAccessDenied } from '@/services/access-feedback/access-denied-toast.client'

export function RouteGuard({
  roles = [],
  requireGuest = false,
  unauthorizedRedirect = '/',
  group = '',
  children,
}: {
  roles?: string[]
  requireGuest?: boolean
  unauthorizedRedirect?: string
  group?: string
  children: ReactNode
}) {
  const router = useRouter()
  const params = useParams()
  const lang = (typeof params?.lang === 'string' ? params.lang : Array.isArray(params?.lang) ? params.lang[0] : '') || 'en'
  const open = roles.length === 0 && !requireGuest
  const [ready, setReady] = useState(open)

  useEffect(() => {
    if (open) return
    let active = true
    const hard = (href: string) => { if (active) window.location.href = href }
    fetch('/api/me')
      .then(async res => {
        if (!res.ok) {
          // No session: guest sign-in, or the auth/register form (cross-origin → hard nav).
          if (requireGuest) return hard(`/api/auth/guest?redirectUrl=${encodeURIComponent(location.href)}`)
          if (roles.length) return hard(registerRedirectUrl(location.href, 'user'))
          if (active) setReady(true)
          return
        }
        // Signed in — check the required roles against the session.
        const session = (await res.json()) as { roles?: string[] }
        if (roles.length && !roles.some(r => session.roles?.includes(r))) {
          // Wrong role: explain WHY (manual-close toast), then SOFT redirect so the
          // toast survives the navigation (window.location would wipe it).
          showAccessDenied({ lang, group, role: session.roles?.[0] })
          if (active) router.replace(unauthorizedRedirect)
          return
        }
        if (active) setReady(true)
      })
      .catch(() => { if (active) router.replace(unauthorizedRedirect) })
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!ready) return null
  return <>{children}</>
}
