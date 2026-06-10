import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// One cheap snapshot for the live-polling /architecture tree (step 106). Returns
// a per-path signature of open tasks (count + last created_at) so the client can
// blink ONLY the node that actually changed, plus the declared requested routes
// and projects in one round-trip. Read-only.

function parseTodo(v: unknown): string[] {
  if (typeof v !== "string") return []
  try { const a = JSON.parse(v); return Array.isArray(a) ? a.map(String) : [] }
  catch { return [] }
}
function parseQuery(v: unknown): { key: string; value: string }[] {
  if (typeof v !== "string") return []
  try {
    const a = JSON.parse(v)
    return Array.isArray(a)
      ? a.map(q => ({ key: String(q?.key ?? ""), value: String(q?.value ?? "") })).filter(q => q.key)
      : []
  } catch { return [] }
}

export async function GET() {
  const sigRows = await db.prepare(
    "SELECT path, COUNT(*) AS count, MAX(created_at) AS last FROM route_tasks WHERE status = 'open' GROUP BY path"
  ).all()
  const tasksByPath: Record<string, { count: number; last: string }> = {}
  for (const r of sigRows) {
    tasksByPath[String(r.path)] = { count: Number(r.count), last: String(r.last ?? "") }
  }

  const reqRows = await db.prepare(
    "SELECT * FROM requested_routes ORDER BY created_at DESC"
  ).all()
  const requested = reqRows.map(r => ({
    ...r,
    kind: r.kind === "api" ? "api" : "page",
    todo: parseTodo(r.todo),
    dynamic: !!r.dynamic,
    query: parseQuery(r.query),
  }))

  const projects = await db.prepare(
    "SELECT id, name, slug, description, created_at FROM projects ORDER BY created_at DESC"
  ).all()

  return NextResponse.json({ tasksByPath, requested, projects })
}
