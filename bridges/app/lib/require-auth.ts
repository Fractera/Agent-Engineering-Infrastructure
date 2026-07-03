import { shouldBypassAuth } from "@/lib/auth-bypass";

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";

// Gate for the admin-cockpit HTTP API on :3002 — every caller of this helper is an
// architect-only surface (/api/config/*, /api/db/*, /api/data/*, /api/rag/*,
// /api/deployments/*, /api/deploy human fallback, /api/agents/readiness). These routes
// are EXCLUDED from proxy.ts's matcher (which architect-gates the PAGES), so each handler
// must guard itself. Step 135 mutation gate: "authorized" here means the architect ROLE,
// not merely a valid session — a logged-in non-architect (guest/user/buyer/…) must NOT be
// able to read or mutate the config/db/secrets surface by hitting /api/* directly.
//   - IP/onboarding mode (shouldBypassAuth) — open (parity with the rest of the surface).
//   - Secure mode — the session cookie must resolve to a role that includes "architect".
// The deploy route checks x-deploy-secret BEFORE calling this, so the MCP/agent deploy
// path is unaffected; agents mutate config through their MCP bridges, not these cookie
// routes. Reads that are meant to be broader live on their own tiered gates, not here.
export async function requireAuth(cookie: string): Promise<boolean> {
  if (shouldBypassAuth()) return true;
  if (!cookie) return false;
  try {
    const res = await fetch(`${AUTH_SERVICE}/api/session`, {
      headers: { cookie },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { roles?: string[] } | null;
    return Array.isArray(data?.roles) && data.roles.includes("architect");
  } catch {
    return false;
  }
}
