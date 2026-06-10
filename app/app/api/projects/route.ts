import { NextRequest, NextResponse } from "next/server"
import { stat } from "fs/promises"
import { getSession } from "@/lib/auth/get-session"
import { DEFAULT_PROJECT, wordCount, slugify } from "@/lib/architecture/projects"
import { scanTree } from "@/lib/architecture/fs-scan"
import { writeRouteMeta, encodePath } from "@/lib/architecture/readme-file"
import { routeDir } from "@/lib/architecture/source-bundle"

// Project layer (ARCHITECTURE §3.12). Independent lines of work under one
// workspace/agent. Source of truth is a folder app/app/project/<slug>/ with a
// README.md (no DB) — same file pattern as the glossary. The "default" project is
// the root tree itself; this endpoint manages the named ones.

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true } catch { return false }
}
async function uniqueSlug(base: string): Promise<string> {
  const seed = base || "project"
  const taken = async (slug: string) =>
    slug === DEFAULT_PROJECT || (await exists(routeDir(`/project/${slug}`)))
  if (!(await taken(seed))) return seed
  let n = 2
  while (await taken(`${seed}-${n}`)) n++
  return `${seed}-${n}`
}

export async function GET() {
  const { projects } = await scanTree()
  return NextResponse.json({
    projects: projects.map(p => ({ id: p.id, name: p.name, slug: p.slug, description: p.description })),
  })
}

export async function POST(req: NextRequest) {
  const { name, description } = await req.json()
  const trimmed = String(name ?? "").trim()
  // Naming standard: at least three words (the "default" project is reserved).
  if (wordCount(trimmed) < 3) {
    return NextResponse.json({ error: "A project name needs at least three words." }, { status: 400 })
  }
  const desc = typeof description === "string" && description.trim() ? description.trim() : null
  const session = await getSession(req)
  const createdBy = session?.email ?? req.headers.get("x-agent-identity") ?? "unknown"
  void createdBy
  const slug = await uniqueSlug(slugify(trimmed))
  const path = `/project/${slug}`
  await writeRouteMeta({ path, title: trimmed, kind: "page", base: "/project", dynamic: false, query: [], description: desc, tasks: [] })
  return NextResponse.json(
    { project: { id: encodePath(path), name: trimmed, slug, description: desc } },
    { status: 201 },
  )
}
