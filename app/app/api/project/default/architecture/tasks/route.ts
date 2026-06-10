import { NextRequest, NextResponse } from "next/server"
import { scanTree } from "@/lib/architecture/fs-scan"
import { readRouteMeta, addTask, clearTasks, taskClientId } from "@/lib/architecture/readme-file"

// Per-route tasks live inside the route's README.md (no DB) — the manual settings
// that keep accruing after a page ships. Two kinds, both flags an agent picks up:
// 'todo' and 'delete' (a deletion+refactor request from the danger zone). The id
// returned to the client encodes the path so a single task can be deleted via
// /architecture/tasks/[id]. Same write path for the human UI and an agent.

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  // Summary mode: route paths that carry any open task — drives the (req) badge.
  if (url.searchParams.get("summary")) {
    const { tasksByPath } = await scanTree()
    const paths = Object.entries(tasksByPath).filter(([, s]) => s.count > 0).map(([p]) => p)
    return NextResponse.json({ paths })
  }
  const path = url.searchParams.get("path")
  const kind = url.searchParams.get("kind")
  if (!path) return NextResponse.json({ error: "path is required" }, { status: 400 })
  const meta = await readRouteMeta(path)
  const tasks = (meta?.tasks ?? [])
    .filter(t => !kind || t.kind === kind)
    .map(t => ({ id: taskClientId(path, t.id), path, kind: t.kind, body: t.body, outcome: t.outcome ?? null }))
  return NextResponse.json({ tasks })
}

export async function POST(req: NextRequest) {
  const { path, kind, body, outcome } = await req.json()
  if (!path || !body?.trim()) {
    return NextResponse.json({ error: "path and body are required" }, { status: 400 })
  }
  const t = await addTask(String(path), { kind, body: String(body), outcome })
  return NextResponse.json(
    { task: { id: taskClientId(String(path), t.id), path, kind: t.kind, body: t.body, outcome: t.outcome ?? null } },
    { status: 201 },
  )
}

// Discard ALL open tasks for a route (danger-zone "Discard all changes") → drops
// the (req) badge. A single task is removed via /architecture/tasks/[id].
export async function DELETE(req: NextRequest) {
  const path = new URL(req.url).searchParams.get("path")
  if (!path) return NextResponse.json({ error: "path is required" }, { status: 400 })
  await clearTasks(path)
  return NextResponse.json({ ok: true })
}
