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
  const h = await headers()
  // HOST-AWARE (256.4b): the bypass opens only IP/localhost hosts — a domain request enforces auth.
  if (shouldBypassAuth(h.get("x-forwarded-host") ?? h.get("host"))) return

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
  //
  // 256.1 — the redirect now carries a callbackUrl (the owner's rule: after login the user RETURNS to
  // the page they wanted), built from x-forwarded-* + the x-pathname header the proxy stamps on every
  // pass-through. requireRole = the LEAST privileged sufficient role (a manager-friendly zone must not
  // demand architect at the auth gate).
  const proto = h.get("x-forwarded-proto") ?? "https"
  const host = h.get("x-forwarded-host") ?? h.get("host")
  const target = new URL(`${authBaseFromHost(host, proto)}/register`)
  const path = h.get("x-pathname")
  if (host && path) target.searchParams.set("callbackUrl", `${proto}://${host}${path}`)
  target.searchParams.set("requireRole", roles.includes("manager") ? "manager" : roles[0])
  redirect(target.toString())
}
