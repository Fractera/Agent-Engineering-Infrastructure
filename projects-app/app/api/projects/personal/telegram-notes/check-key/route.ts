import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";

// Live "check key / API" probe for the automation's integrations (step 188-R). Called from
// the diagram node panel (a node whose envKeys include the integration) and the bot-key
// settings tab. Verifies the credential actually WORKS, not just that it is present:
//   - telegram → getMe (the bot token is valid)
//   - openai   → a tiny models list (the key authorizes)
//   - lightrag → the memory service health
// Returns { ok, detail }. Role-gated like the other project-config routes.
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
  // The OpenAI key lives where Hermes keeps it — ask the slot forwarder whether it is configured.
  try {
    const admin = process.env.ADMIN_INTERNAL_URL ?? "http://localhost:3002";
    const r = await fetch(`${admin}/api/config/hermes`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return { ok: false, detail: "could not reach the key store (inconclusive)" };
    const d = (await r.json()) as { configured?: boolean };
    // Name the model the automation runs on (step 207.19 owner request: the test toast must say it).
    const model = process.env.TELEGRAM_NOTES_MODEL || "gpt-4o-mini (default)";
    return d?.configured
      ? { ok: true, detail: `OpenAI key is configured · automation model: ${model}` }
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

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let body: { target?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const target = (body.target ?? "").toLowerCase();
  const result =
    target === "telegram"
      ? await checkTelegram()
      : target === "openai"
        ? await checkOpenai(req)
        : target === "lightrag"
          ? await checkLightrag()
          : null;
  if (!result) {
    return NextResponse.json({ error: "unknown target (telegram|openai|lightrag)" }, { status: 422 });
  }
  return NextResponse.json(result);
}
