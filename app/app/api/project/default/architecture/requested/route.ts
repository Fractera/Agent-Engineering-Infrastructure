import { NextRequest, NextResponse } from "next/server"
import { stat } from "fs/promises"
import { join } from "path"
import { getSession } from "@/lib/auth/get-session"
import { scanTree } from "@/lib/architecture/fs-scan"
import { writeRouteMeta, encodePath, type Task } from "@/lib/architecture/readme-file"
import { routeDir } from "@/lib/architecture/source-bundle"
import { CODE_DIFF_PREFIX } from "@/lib/architecture/line-diff"

// Declared routes = declared-but-not-built pages/endpoints (ARCHITECTURE §3.11).
// Source of truth is a real README.md on disk under app/app/<path>/ (no DB), so
// an agent reads the work directly. This endpoint declares (POST) and lists (GET,
// from the filesystem scan). Turning a declaration into a real page is a separate
// agent step.

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60)
}
const RESERVED = ["/", "/dashboard", "/ai-core", "/architecture", "/debug", "/api"]
function joinPath(base: string, slug: string): string {
  return base === "/" ? `/${slug}` : `${base}/${slug}`
}
function normalizeBase(b: unknown): string {
  let s = typeof b === "string" ? b.trim() : "/"
  if (!s || s === "/") return "/"
  if (!s.startsWith("/")) s = "/" + s
  return s.replace(/\/+$/, "")
}
async function dirTaken(href: string): Promise<boolean> {
  if (RESERVED.includes(href)) return true
  try { await stat(join(routeDir(href), "README.md")); return true } catch {}
  try { await stat(join(routeDir(href), "page.tsx")); return true } catch {}
  return false
}
async function uniqueLeaf(base: string, seedSlug: string, dynamic: boolean): Promise<string> {
  const seg = (s: string) => (dynamic ? `[${s}]` : s)
  const seed = seedSlug || "page"
  if (!(await dirTaken(joinPath(base, seg(seed))))) return seed
  let n = 2
  while (await dirTaken(joinPath(base, seg(`${seed}-${n}`)))) n++
  return `${seed}-${n}`
}

type QP = { key: string; value: string }

export async function GET() {
  const { requested } = await scanTree()
  return NextResponse.json({ requested })
}

export async function POST(req: NextRequest) {
  const { title, todo, base, dynamic, queryParams, kind, example } = await req.json()
  if (!title?.trim()) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }
  const routeKind: "page" | "api" = kind === "api" ? "api" : "page"
  const items: string[] = Array.isArray(todo)
    ? todo.map(String).map((s: string) => s.trim()).filter(Boolean)
    : []
  const query: QP[] = Array.isArray(queryParams)
    ? queryParams.map((q: QP) => ({ key: String(q?.key ?? "").trim(), value: String(q?.value ?? "").trim() })).filter((q: QP) => q.key)
    : []
  const isDynamic = !!dynamic

  const session = await getSession(req)
  const createdBy = session?.email ?? req.headers.get("x-agent-identity") ?? "unknown"
  const basePath = normalizeBase(base)
  const slug = await uniqueLeaf(basePath, slugify(title), isDynamic)
  const seg = isDynamic ? `[${slug}]` : slug
  const href = joinPath(basePath, seg)

  // Seed the declaration's to-do list from the initial items + an optional pasted
  // code example (stored as a "Code update — <file>" diff task, same format the
  // Source editor uses) — all materialized into the README.md, the agent's record.
  const tasks: Task[] = items.map(body => ({ id: crypto.randomUUID(), kind: "todo", body, outcome: null }))
  if (typeof example === "string" && example.trim()) {
    const fname = routeKind === "api" ? "route.ts" : "page.tsx"
    const diff = example.split("\n").map(l => "+" + l).join("\n")
    tasks.push({ id: crypto.randomUUID(), kind: "todo", body: `${CODE_DIFF_PREFIX}${fname}\n${diff}`, outcome: null })
  }

  await writeRouteMeta({ path: href, title: String(title).trim(), kind: routeKind, base: basePath, dynamic: isDynamic, query, tasks })

  return NextResponse.json(
    {
      requested: {
        id: encodePath(href),
        slug, kind: routeKind, base: basePath, dynamic: isDynamic, query,
        title: String(title).trim(), todo: items, status: "requested", created_at: new Date().toISOString(), created_by: createdBy,
      },
    },
    { status: 201 },
  )
}
