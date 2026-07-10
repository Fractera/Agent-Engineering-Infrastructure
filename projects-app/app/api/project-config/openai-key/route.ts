import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/get-session"

// Slot forwarder for the OpenAI (Fractera AI) key (step 187.9). The missing-keys modal
// lives in the slot (:3000) but the OpenAI key belongs where Hermes keeps it —
// /root/.hermes/.env + the credential pool, written by the Admin route
// :3002 /api/config/hermes (which also switches the provider and, best-effort, fills the
// memory/LightRAG key with the same value; the memory key stays independently editable).
// A direct browser call from :3000 to :3002 is fragile (CORS/cookies in IP mode), so this
// server-to-server forwarder reuses ALL of Hermes' logic and duplicates none. Role-gated
// like the slot env setter (186.4).
export const runtime = "nodejs"

const WRITE_ROLES = ["architect", "manager", "agent"]
const ADMIN_URL = process.env.ADMIN_INTERNAL_URL ?? "http://localhost:3002"

async function authorize(req: NextRequest): Promise<boolean> {
  const session = await getSession(req)
  return Boolean(session?.roles?.some((r) => WRITE_ROLES.includes(r)))
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  try {
    const res = await fetch(`${ADMIN_URL}/api/config/hermes`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json({ configured: false }, { status: 200 })
    const data = (await res.json()) as { configured?: boolean }
    return NextResponse.json({ configured: Boolean(data.configured) })
  } catch {
    // Admin unreachable (e.g. Hermes not installed) — report not configured, don't crash.
    return NextResponse.json({ configured: false }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  let body: { apiKey?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }
  const apiKey = (body.apiKey ?? "").trim()
  if (!apiKey) return NextResponse.json({ error: "apiKey is required" }, { status: 400 })

  try {
    const res = await fetch(`${ADMIN_URL}/api/config/hermes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: req.headers.get("cookie") ?? "" },
      body: JSON.stringify({ apiKey }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: (data as { error?: string }).error ?? `save failed (HTTP ${res.status})` },
        { status: res.status },
      )
    }
    // Pass through Hermes' outcome (alsoUpdated: "rag" means the memory key got the same value).
    return NextResponse.json({ ok: true, ...(data as object) })
  } catch {
    return NextResponse.json({ error: "could not reach the key store" }, { status: 502 })
  }
}
