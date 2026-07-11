import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";

// FROZEN SHARED TEST ROUTE (step 220) — the ONE place the typed, channel-level probes live, reused by
// every project. A probe depends on the CHANNEL TYPE, not the project, so it is declared once here and
// invoked as POST /api/projects/tests/<kind>. This generalizes the old per-project check-key route
// (which was really project-agnostic). Verifies the credential actually WORKS, not just that it is set:
//   - telegram        → getMe (the bot token is valid)
//   - openai          → the key store reports configured (via the Admin forwarder)
//   - lightrag        → the memory service health
//   - google-calendar → the OAuth client credentials are present in the env (configured)
//
// Contract: POST → { ok: boolean; detail: string }. `detail` is for debugging; the user-facing line
// comes from the declaring project's _data/tests.ts. Role-gated like the other project-config routes.
//
// A named folder "tests" (NOT "_tests"): Next.js does not route "_"-prefixed folders, and the projects
// manifest skips them — a served route must be a normal segment.
export const runtime = "nodejs";

const ROLES = ["architect", "manager", "agent"];
const RAG_URL = (process.env.LIGHTRAG_URL ?? "http://localhost:9621").replace(/\/+$/, "");
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";

async function checkTelegram(): Promise<{ ok: boolean; detail: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  if (!token) return { ok: false, detail: "TELEGRAM_BOT_TOKEN is not set" };
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      signal: AbortSignal.timeout(8000),
    });
    const d = (await r.json()) as { ok?: boolean; result?: { username?: string }; description?: string };
    return d?.ok
      ? { ok: true, detail: `Bot @${d.result?.username ?? "?"} is reachable` }
      : { ok: false, detail: d?.description ?? "Telegram rejected the token" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "Telegram unreachable" };
  }
}

async function checkOpenai(req: NextRequest): Promise<{ ok: boolean; detail: string }> {
  // The OpenAI key lives where the platform keeps it — ask the Admin forwarder whether it is configured.
  try {
    const admin = process.env.ADMIN_INTERNAL_URL ?? "http://localhost:3002";
    const r = await fetch(`${admin}/api/config/hermes`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { ok: false, detail: "could not reach the key store (inconclusive)" };
    const d = (await r.json()) as { configured?: boolean };
    return d?.configured
      ? { ok: true, detail: "OpenAI key is configured" }
      : { ok: false, detail: "OpenAI key is not configured" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "key store unreachable" };
  }
}

async function checkLightrag(): Promise<{ ok: boolean; detail: string }> {
  try {
    const r = await fetch(`${RAG_URL}/health`, {
      headers: RAG_KEY ? { "X-API-Key": RAG_KEY } : undefined,
      signal: AbortSignal.timeout(8000),
    });
    return r.ok
      ? { ok: true, detail: "Memory (LightRAG) is reachable" }
      : { ok: false, detail: `Memory returned HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "Memory unreachable" };
  }
}

// Channel-type check for a Google Calendar connection: are the OAuth client credentials present?
// The deeper "is a token stored / connected" state is project-specific (a project probe), not this
// frozen channel-type check.
function checkGoogleCalendar(): { ok: boolean; detail: string } {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
  if (id && secret) return { ok: true, detail: "Google OAuth credentials are configured" };
  return { ok: false, detail: "Google OAuth client id / secret are not set (optional connector)" };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { kind } = await params;
  const k = (kind ?? "").toLowerCase();
  const result =
    k === "telegram"
      ? await checkTelegram()
      : k === "openai"
        ? await checkOpenai(req)
        : k === "lightrag"
          ? await checkLightrag()
          : k === "google-calendar"
            ? checkGoogleCalendar()
            : null;
  if (!result) {
    return NextResponse.json(
      { error: "unknown kind (telegram|openai|lightrag|google-calendar)" },
      { status: 422 },
    );
  }
  return NextResponse.json(result);
}
