import type { ReactNode } from 'react'
import { getSession } from '@/lib/auth/get-session'
import { redirect } from 'next/navigation'

// SEAM — ASPECT: roles (Slot B). DECLARED. A server guard composed uniformly into the
// tab layout when the roles aspect is enabled. It reads identity the platform way
// (getSession honors X-Agent-Identity + dev-bypass) and enforces access exactly like
// the platform route guard (HOW-USE-AUTH.md): a visitor lacking the required role is
// redirected to register. The reference primitive ships roles OFF, so the composer
// does NOT inject this; the file documents the seam contract for the next brick.
//
// Uniform-at-every-level: the SAME guard wraps every depth level via the layout — it
// never special-cases depth or the data source (Two-Slot Law).
export async function RoleGuard({ roles, children }: { roles: string[]; children: ReactNode }) {
  const session = await getSession()
  const ok = !!session?.roles?.some((r: string) => roles.includes(r))
  if (!ok) redirect(`/register?requireRole=${roles[0]}`)
  return <>{children}</>
}
