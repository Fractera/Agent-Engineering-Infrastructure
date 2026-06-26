import type { ReactNode } from 'react'
{{ASPECT_IMPORTS}}
export default function {{TAB_PASCAL}}Layout({ children }: { children: ReactNode }) {
  // ACCESS — the return below IS the gate. Public = `return <>{children}</>`. To change
  // access, replace the return with one option (each needs the RouteGuard import at the
  // top). Client guard keeps the page static (recipe: HOW-USE-AUTH.md). Enforced in
  // SECURE mode only — in IP/dev mode auth is bypassed to architect, so the gate is open.
  //   public+guest : return <RouteGuard requireGuest>{children}</RouteGuard>
  //   logged-in    : return <RouteGuard roles={['user']} unauthorizedRedirect="/">{children}</RouteGuard>
  //   role list    : return <RouteGuard roles={['user','manager']} unauthorizedRedirect="/">{children}</RouteGuard>
  // Roles match LITERALLY — 'architect' is NOT auto-included in a 'user' gate; add it to
  // the list if the owner must keep access. Valid roles (lib/roles.ts): guest user
  // architect buyer vip_user subscriber_lite subscriber_standard subscriber_max manager
  // senior_manager support_manager delivery_manager finance content_editor admin
  //   server-hide (architect-only, makes the group DYNAMIC): import { requireAdmin } from
  //   '@/lib/auth/require-admin'; make the function async; await requireAdmin()
  // The guard shows a manual-close "access denied" toast on a wrong-role visit. To fire
  // it yourself from custom access logic (translated by default, 82 languages):
  //   import { showAccessDenied } from '@/services/access-feedback/access-denied-toast.client'
  //   showAccessDenied({ lang, group: 'News', role })
  return ({{ASPECT_OPEN}}<>{children}</>{{ASPECT_CLOSE}})
}
