import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { shouldBypassAuth } from "@/lib/auth/auth-bypass"

// Server-component guard for the admin-only service pages (AI Core, Architecture,
// Development steps, Patterns, Glossary, Documents, AI Draft Settings, Debug).
// Mirrors getSession() (lib/auth/get-session.ts) but for server components — it
// reads cookies()/headers() from next/headers instead of a NextRequest. Reading
// cookies() forces dynamic rendering, which is why these pages are rendering:"dynamic".
//
// IP/onboarding mode: open (shouldBypassAuth). Agents (x-agent-identity): allowed.
// Otherwise the caller must hold the admin role, else redirect to the role gate
// (same convention as the dashboard auth-redirect, step 80).
export async function requireAdmin(): Promise<void> {
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
      if (Array.isArray(session?.roles) && session.roles.includes("admin")) return
    }
  } catch {
    // fall through to redirect
  }

  redirect("/register?requireRole=admin")
}
