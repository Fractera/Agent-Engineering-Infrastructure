import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth/get-session"

// Per-route tasks on EXISTING pages — the manual settings that keep accruing
// after a page ships (development doesn't end at publish). Two kinds, both flags
// an agent picks up: 'todo' (ongoing work on the page) and 'delete' (a deletion
// + refactor request from the danger zone). Same write path for the human UI and
// for an orchestrating agent (X-Agent-Identity). No real file is touched here.

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  // Summary mode: distinct route paths that have any open task — drives the
  // (req) badge in the tree for existing pages that carry pending work.
  if (url.searchParams.get("summary")) {
    const rows = await db.prepare(
      "SELECT DISTINCT path FROM route_tasks WHERE status = 'open'"
    ).all()
    return NextResponse.json({ paths: rows.map(r => r.path) })
  }
  const path = url.searchParams.get("path")
  const kind = url.searchParams.get("kind")
  if (!path) return NextResponse.json({ error: "path is required" }, { status: 400 })
  const tasks = kind
    ? await db.prepare(
        "SELECT * FROM route_tasks WHERE path = ? AND kind = ? AND status = 'open' ORDER BY created_at DESC"
      ).all(path, kind)
    : await db.prepare(
        "SELECT * FROM route_tasks WHERE path = ? AND status = 'open' ORDER BY created_at DESC"
      ).all(path)
  return NextResponse.json({ tasks })
}

export async function POST(req: NextRequest) {
  const { path, kind, body, outcome } = await req.json()
  if (!path || !body?.trim()) {
    return NextResponse.json({ error: "path and body are required" }, { status: 400 })
  }
  const k = kind === "delete" ? "delete" : "todo"
  const session = await getSession(req)
  const createdBy = session?.email ?? req.headers.get("x-agent-identity") ?? "unknown"
  const id = crypto.randomUUID()
  await db.prepare(
    "INSERT INTO route_tasks (id, path, kind, body, outcome, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, String(path), k, String(body).trim(), outcome ? String(outcome).trim() : null, createdBy)
  const task = await db.prepare("SELECT * FROM route_tasks WHERE id = ?").get(id)
  return NextResponse.json({ task }, { status: 201 })
}
