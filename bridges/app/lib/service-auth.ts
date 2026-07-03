import { NextRequest } from "next/server"
import { shouldBypassAuth } from "@/lib/auth-bypass"

// API-route gate for the migrated service endpoints (/api/glossary, /api/patterns,
// /api/project/default/architecture/*, …). Mirrors the slot's apiAuthGate: the
// admin proxy.ts EXCLUDES /api/* from its matcher, so these handlers must guard
// themselves. Three ways in (same trust model the slot used on :3000):
//   1. IP/onboarding mode (shouldBypassAuth) — open.
//   2. An agent call carrying x-agent-identity — allowed (role: agent). This is the
//      same bes-cookie header the coding agents already use on :3000; carried over
//      as-is (a known compromise, candidate for the future "MCP access tiers" step).
//   3. A human with the architect role — verified against the auth service by cookie.
// The service PAGES themselves are gated by the admin proxy.ts (architect-only in
// Secure mode, open in IP mode) — no per-page guard needed.

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001"

export type ServiceIdentity = {
  userId: string
  email: string
  roles: string[]
}

export async function serviceApiIdentity(req: NextRequest): Promise<ServiceIdentity | null> {
  const agentId = req.headers.get("x-agent-identity")
  if (agentId) {
    return { userId: `${agentId}@agent`, email: `${agentId}@agent`, roles: ["agent"] }
  }

  if (shouldBypassAuth()) {
    return { userId: "demo@local", email: "demo@local", roles: ["architect"] }
  }

  const cookie = req.headers.get("cookie") ?? ""
  if (!cookie) return null
  try {
    const res = await fetch(`${AUTH_SERVICE}/api/session`, {
      headers: { cookie },
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as ServiceIdentity | null
    if (data && Array.isArray(data.roles) && data.roles.includes("architect")) return data
    return null
  } catch {
    return null
  }
}

// Boolean helper for handlers that only need pass/deny.
export async function serviceApiGate(req: NextRequest): Promise<boolean> {
  return (await serviceApiIdentity(req)) !== null
}
