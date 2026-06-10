import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth/get-session"

// Requested routes = declared-but-not-built pages (ARCHITECTURE §3.11). Each is a
// title + a free-form todo list — a flag an agent (or the owner) drops here, that
// an agent later reads, plans and builds. This endpoint only declares/lists them;
// turning a todo into a real page is a separate step.

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)
}

// Reserved real route paths the Shell already serves — a declared page may not
// collide with them (nor with another declared page). On collision we append a
// numeric suffix (-2, -3, …) so the name is always valid and unique.
const RESERVED = ["", "dashboard", "ai-core", "architecture", "debug", "api"]

async function uniqueSlug(base: string): Promise<string> {
  const seed = base || "page"
  const rows = await db.prepare("SELECT slug FROM requested_routes").all()
  const taken = new Set<string>([...RESERVED, ...rows.map(r => String(r.slug))])
  if (!taken.has(seed)) return seed
  let n = 2
  while (taken.has(`${seed}-${n}`)) n++
  return `${seed}-${n}`
}

function parseTodo(v: unknown): string[] {
  if (typeof v !== "string") return []
  try { const a = JSON.parse(v); return Array.isArray(a) ? a.map(String) : [] }
  catch { return [] }
}

export async function GET() {
  const rows = await db.prepare(
    "SELECT * FROM requested_routes ORDER BY created_at DESC"
  ).all()
  const requested = rows.map(r => ({ ...r, todo: parseTodo(r.todo) }))
  return NextResponse.json({ requested })
}

export async function POST(req: NextRequest) {
  const { title, todo } = await req.json()
  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }
  const items: string[] = Array.isArray(todo)
    ? todo.map(String).map((s: string) => s.trim()).filter(Boolean)
    : []

  const session = await getSession(req)
  const createdBy = session?.email ?? "unknown"
  const id = crypto.randomUUID()
  const slug = await uniqueSlug(slugify(title))
  await db.prepare(
    "INSERT INTO requested_routes (id, slug, title, todo, status, created_by) VALUES (?, ?, ?, ?, 'requested', ?)"
  ).run(id, slug, String(title).trim(), JSON.stringify(items), createdBy)

  const row = await db.prepare("SELECT * FROM requested_routes WHERE id = ?").get(id)
  return NextResponse.json(
    { requested: row ? { ...row, todo: parseTodo(row.todo) } : null },
    { status: 201 },
  )
}
