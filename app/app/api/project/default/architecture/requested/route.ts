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

// Reserved real route hrefs the Shell already serves — a declared page may not
// collide with them (nor with another declared page). Uniqueness is by the FULL
// path (base + slug), so /dashboard/settings and /settings can coexist. On
// collision we append a numeric suffix (-2, -3, …).
const RESERVED = ["/", "/dashboard", "/ai-core", "/architecture", "/debug", "/api"]

function joinPath(base: string, slug: string): string {
  return base === "/" ? `/${slug}` : `${base}/${slug}`
}

// Normalize a base path: leading slash, no trailing slash, default root.
function normalizeBase(b: unknown): string {
  let s = typeof b === "string" ? b.trim() : "/"
  if (!s || s === "/") return "/"
  if (!s.startsWith("/")) s = "/" + s
  return s.replace(/\/+$/, "")
}

async function uniqueLeaf(base: string, seedSlug: string): Promise<string> {
  const seed = seedSlug || "page"
  const rows = await db.prepare("SELECT slug, base FROM requested_routes").all()
  const taken = new Set<string>([
    ...RESERVED,
    ...rows.map(r => joinPath(String(r.base ?? "/"), String(r.slug))),
  ])
  if (!taken.has(joinPath(base, seed))) return seed
  let n = 2
  while (taken.has(joinPath(base, `${seed}-${n}`))) n++
  return `${seed}-${n}`
}

function parseTodo(v: unknown): string[] {
  if (typeof v !== "string") return []
  try { const a = JSON.parse(v); return Array.isArray(a) ? a.map(String) : [] }
  catch { return [] }
}

type QP = { key: string; value: string }
function parseQuery(v: unknown): QP[] {
  if (typeof v !== "string") return []
  try {
    const a = JSON.parse(v)
    return Array.isArray(a)
      ? a.map((q): QP => ({ key: String(q?.key ?? ""), value: String(q?.value ?? "") })).filter(q => q.key)
      : []
  } catch { return [] }
}

export async function GET() {
  const rows = await db.prepare(
    "SELECT * FROM requested_routes ORDER BY created_at DESC"
  ).all()
  const requested = rows.map(r => ({
    ...r,
    kind: r.kind === "api" ? "api" : "page",
    todo: parseTodo(r.todo),
    dynamic: !!r.dynamic,
    query: parseQuery(r.query),
  }))
  return NextResponse.json({ requested })
}

export async function POST(req: NextRequest) {
  const { title, todo, base, dynamic, queryParams, kind, example } = await req.json()
  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }
  const routeKind = kind === "api" ? "api" : "page"
  const items: string[] = Array.isArray(todo)
    ? todo.map(String).map((s: string) => s.trim()).filter(Boolean)
    : []
  // Query params are a free-text spec for the agent — store as-is (key required).
  const query: QP[] = Array.isArray(queryParams)
    ? queryParams.map((q: QP) => ({ key: String(q?.key ?? "").trim(), value: String(q?.value ?? "").trim() })).filter((q: QP) => q.key)
    : []
  const isDynamic = dynamic ? 1 : 0

  const session = await getSession(req)
  const createdBy = session?.email ?? req.headers.get("x-agent-identity") ?? "unknown"
  const id = crypto.randomUUID()
  const basePath = normalizeBase(base)
  const slug = await uniqueLeaf(basePath, slugify(title))
  await db.prepare(
    "INSERT INTO requested_routes (id, slug, kind, base, dynamic, query, title, todo, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'requested', ?)"
  ).run(id, slug, routeKind, basePath, isDynamic, JSON.stringify(query), String(title).trim(), JSON.stringify(items), createdBy)

  // Seed the initial to-do items as route_tasks under the declared route's path,
  // so the same editable to-do list / danger zone work for it like any page.
  const seg = isDynamic ? `[${slug}]` : slug
  const href = joinPath(basePath, seg)
  for (const item of items) {
    await db.prepare(
      "INSERT INTO route_tasks (id, path, kind, body, created_by) VALUES (?, ?, 'todo', ?, ?)"
    ).run(crypto.randomUUID(), href, item, createdBy)
  }
  // An example pasted in the Source editor → a code-change request the agent can
  // build from. Stored in the same "Code update — <file>" + unified-diff format.
  if (typeof example === "string" && example.trim()) {
    const fname = routeKind === "api" ? "route.ts" : "page.tsx"
    const diff = example.split("\n").map(l => "+" + l).join("\n")
    await db.prepare(
      "INSERT INTO route_tasks (id, path, kind, body, created_by) VALUES (?, ?, 'todo', ?, ?)"
    ).run(crypto.randomUUID(), href, `Code update — ${fname}\n${diff}`, createdBy)
  }

  const row = await db.prepare("SELECT * FROM requested_routes WHERE id = ?").get(id)
  return NextResponse.json(
    { requested: row ? { ...row, kind: row.kind === "api" ? "api" : "page", todo: parseTodo(row.todo), dynamic: !!row.dynamic, query: parseQuery(row.query) } : null },
    { status: 201 },
  )
}
