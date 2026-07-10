import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { shouldBypassAuth } from "@/lib/auth/auth-bypass"
import { authBaseFromHost } from "@/lib/auth-base-server"

// Server-component role guard — the generalized form of requireAdmin()
// (lib/auth/require-admin.ts): pass the roles that may enter; anyone else is
// redirected to the auth-service register gate. Used by zones whose access is
// wider than architect-only, e.g. the Projects layer (§3.12) which admits
// architect + manager. Reading cookies() forces dynamic rendering — callers are
// cockpit pages where dynamic is the sanctioned exception.
//
// IP/onboarding mode: open (shouldBypassAuth). Agents (x-agent-identity): allowed.
export async function requireRole(roles: string[]): Promise<void> {
  if (shouldBypassAuth()) return

  const h = await headers()
  if (h.get("x-agent-identity")) return

  const authUrl =
    process.env.AUTH_SERVICE_URL ??
    process.env.NEXT_PUBLIC_AUTH_URL ??
    "http://localhost:3001"
  const cookie = (await cookies()).toString()

  try {
    const res = await fetch(`${authUrl}/api/session`, {
      headers: { cookie },
      cache: "no-store",
    })
    if (res.ok) {
      const session = (await res.json()) as { roles?: string[] } | null
      if (session?.roles?.some((r) => roles.includes(r))) return
    }
  } catch {
    // fall through to redirect
  }

  // Same convention as requireAdmin(): the register/login forms live on the AUTH
  // service host — a relative "/register" would be language-prefixed by proxy.ts
  // into a page this app does not have. Build the absolute auth URL instead.
  const proto = h.get("x-forwarded-proto") ?? "https"
  const host = h.get("x-forwarded-host") ?? h.get("host")
  redirect(`${authBaseFromHost(host, proto)}/register?requireRole=${roles[0]}`)
}
