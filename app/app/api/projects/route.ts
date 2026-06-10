import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getSession } from "@/lib/auth/get-session"
import { DEFAULT_PROJECT, wordCount, slugify } from "@/lib/architecture/projects"
import { syncRouteReadme, removeRouteReadme } from "@/lib/declared-readme"

// Project layer (ARCHITECTURE §3.12). Independent lines of work under one
// workspace/agent — organizational metadata, no extra infra or token cost.
// Same write path for the human UI and an agent. The "default" project is
// synthesised by the UI; this endpoint manages the named ones.

async function uniqueSlug(base: string): Promise<string> {
  const seed = base || "project"
  const rows = await db.prepare("SELECT slug FROM projects").all()
  const taken = new Set<string>([DEFAULT_PROJECT, ...rows.map(r => String(r.slug ?? ""))])
  if (!taken.has(seed)) return seed
  let n = 2
  while (taken.has(`${seed}-${n}`)) n++
  return `${seed}-${n}`
}

export async function GET() {
  const projects = await db.prepare(
    "SELECT id, name, slug, description, created_at FROM projects ORDER BY created_at DESC"
  ).all()
  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const { name, description } = await req.json()
  const trimmed = String(name ?? "").trim()
  // Naming standard: at least three words (the "default" project is reserved).
  if (wordCount(trimmed) < 3) {
    return NextResponse.json(
      { error: "A project name needs at least three words." }, { status: 400 },
    )
  }
  // Optional description — disambiguates which project a task belongs to.
  const desc = typeof description === "string" && description.trim() ? description.trim() : null
  const session = await getSession(req)
  const createdBy = session?.email ?? req.headers.get("x-agent-identity") ?? "unknown"
  const slug = await uniqueSlug(slugify(trimmed))
  const id = crypto.randomUUID()
  try {
    await db.prepare(
      "INSERT INTO projects (id, name, slug, description) VALUES (?, ?, ?, ?)"
    ).run(id, trimmed, slug, desc)
  } catch {
    return NextResponse.json({ error: "A project with this name already exists." }, { status: 409 })
  }
  void createdBy
  await syncRouteReadme(`/project/${slug}`)
  const project = await db.prepare("SELECT id, name, slug, description, created_at FROM projects WHERE id = ?").get(id)
  return NextResponse.json({ project }, { status: 201 })
}

// Remove a declared project by slug (filesystem-first, step 108).
export async function DELETE(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug")
  if (!slug) return NextResponse.json({ error: "slug is required" }, { status: 400 })
  const path = `/project/${slug}`
  await db.prepare("DELETE FROM route_tasks WHERE path = ?").run(path)
  await db.prepare("DELETE FROM projects WHERE slug = ?").run(slug)
  await removeRouteReadme(path)
  return NextResponse.json({ ok: true })
}
