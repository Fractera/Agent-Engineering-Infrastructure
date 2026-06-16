import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/get-session'

// Resolve the consultant access tier from the request's authenticated identity
// (MCP-REGISTRY §8.3). The tier is decided SERVER-SIDE from the session — never from
// anything the browser claims. The public Hermes process caps at `user` regardless, so
// this tier mainly drives: which user-actions are offered, R6 (ask-to-authorize), and
// the modal header ("You: Guest / User / Owner").
//
//   no session            → public (anonymous visitor)
//   logged-in, admin/agent → owner  (workspace operator)
//   logged-in, otherwise   → user   (authenticated end-user; data scoped to identity)

export type ConsultantTier = 'public' | 'user' | 'owner'

export async function resolveTier(req?: NextRequest): Promise<{ tier: ConsultantTier; userId: string | null }> {
  const session = await getSession(req)
  if (!session) return { tier: 'public', userId: null }
  const roles = session.roles ?? []
  if (roles.includes('admin') || roles.includes('agent')) return { tier: 'owner', userId: session.userId }
  return { tier: 'user', userId: session.userId }
}
