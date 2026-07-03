import type { NextRequest } from "next/server"
import { serviceApiIdentity, type ServiceIdentity } from "@/lib/service-auth"

// Admin-side equivalent of the slot's getSession, used by migrated service API
// routes only for author attribution (session?.email). Backed by the same identity
// resolution as serviceApiGate (x-agent-identity → agent, IP/bypass → demo@local,
// else architect cookie against :3001), so the two never disagree. The handler is
// already gated by serviceApiGate before this is called, so identity is non-null
// on the success path; a bare request (no req) yields null.
export type AppSession = ServiceIdentity

export async function getSession(req?: NextRequest): Promise<AppSession | null> {
  if (!req) return null
  return serviceApiIdentity(req)
}
