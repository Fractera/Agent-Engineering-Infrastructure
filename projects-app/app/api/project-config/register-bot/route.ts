import { NextRequest, NextResponse } from "next/server"
import { readFile, writeFile, mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import { getSession } from "@/lib/auth/get-session"

// Registers THIS automation's Telegram bot with the substrate fractera-automations listener (step 205,
// per-automation-telegram-config.md §2). The listener reads registry.json — [{category, project, token}]
// — and polls one bot per automation, forwarding each message to /api/projects/<cat>/<proj>/run. This
// route upserts this automation's entry (one automation → one bot). Best-effort + self-sufficient: on a
// box without the listener dir it still returns ok (the slot env token was saved separately); the
// registry just won't exist until a listener is present.
export const runtime = "nodejs"

const WRITE_ROLES = ["architect", "manager", "agent"]
const REGISTRY_PATH =
  process.env.AUTOMATIONS_REGISTRY_PATH ?? "/opt/fractera/services/automations-listener/registry.json"
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/
const TOKEN_RE = /^\d+:[A-Za-z0-9_-]{20,}$/

type Entry = { category: string; project: string; token: string }

async function authorize(req: NextRequest): Promise<boolean> {
  const session = await getSession(req)
  return Boolean(session?.roles?.some((r) => WRITE_ROLES.includes(r)))
}

async function readRegistry(): Promise<Entry[]> {
  try {
    const raw = JSON.parse(await readFile(REGISTRY_PATH, "utf8"))
    return Array.isArray(raw) ? raw.filter((e) => e && e.category && e.project && e.token) : []
  } catch {
    return []
  }
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 })

  let body: { category?: string; project?: string; token?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 })
  }

  const category = (body.category ?? "").trim()
  const project = (body.project ?? "").trim()
  const token = (body.token ?? "").trim()
  if (!SLUG_RE.test(category) || !SLUG_RE.test(project)) {
    return NextResponse.json({ error: "invalid category/project" }, { status: 422 })
  }
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: "invalid bot token" }, { status: 422 })

  // Upsert by {category, project}: one automation → one bot.
  const entries = await readRegistry()
  const idx = entries.findIndex((e) => e.category === category && e.project === project)
  if (idx >= 0) entries[idx] = { category, project, token }
  else entries.push({ category, project, token })

  try {
    await mkdir(dirname(REGISTRY_PATH), { recursive: true })
    await writeFile(REGISTRY_PATH, JSON.stringify(entries, null, 2) + "\n", "utf8")
    return NextResponse.json({ ok: true, registered: true })
  } catch (e) {
    // Best-effort: no listener dir yet (e.g. a box that hasn't installed the listener). The slot env
    // token is still saved; the automation just won't receive until a listener + registry exist.
    return NextResponse.json({ ok: true, registered: false, note: e instanceof Error ? e.message : String(e) })
  }
}
