import { mkdir, writeFile, rm } from "fs/promises"
import { join } from "path"
import { db } from "./db"
import { routeDir } from "./architecture/source-bundle"

// Materialize a real README.md on disk for each declared route/project/endpoint,
// holding the text record of its tasks (create/change/delete intent). This is
// what an agent reads when it opens the entity's folder — the DB is only the UI
// index; the README.md is the agent-facing source of work. Without this, declared
// tasks live only in the DB and no agent ever sees them.

type Row = Record<string, unknown>

function hrefOf(r: Row): string {
  const base = r.base && r.base !== "/" ? String(r.base) : ""
  const seg = r.dynamic ? `[${String(r.slug)}]` : String(r.slug)
  return `${base}/${seg}`
}

function renderReadme(path: string, decl: Row | null, project: Row | null, tasks: Row[]): string {
  const title = (decl?.title as string) || (project?.name as string) || path
  const kind = decl?.kind === "api" ? "endpoint" : project ? "project" : "page"
  const todos = tasks.filter(t => t.kind !== "delete")
  const dels = tasks.filter(t => t.kind === "delete")

  let q: { key: string; value: string }[] = []
  try { const a = JSON.parse(String(decl?.query ?? "[]")); if (Array.isArray(a)) q = a } catch {}

  const lines: string[] = []
  lines.push(`# ${title}`, "")
  lines.push(`> Declared via the Architecture page. This README is the record an agent reads`)
  lines.push(`> to pick up the work below and build / change / remove this ${kind}.`, "")
  lines.push(`- **Path:** \`${path}\``)
  lines.push(`- **Kind:** ${kind}`)
  lines.push(`- **Status:** ${decl ? "requested (not built yet)" : "live"}`)
  if (project?.description) lines.push(`- **Description:** ${String(project.description)}`)
  lines.push("")

  if (q.length) {
    lines.push("## Query params")
    for (const p of q) lines.push(`- \`${p.key}\` = ${p.value || "—"}`)
    lines.push("")
  }

  lines.push("## To-do (for the agent)")
  if (todos.length === 0) lines.push("_No open tasks._")
  else for (const t of todos) lines.push(`- ${String(t.body)}`)
  lines.push("")

  if (dels.length) {
    lines.push("## Deletion request")
    for (const d of dels) {
      lines.push(`> **Reason:** ${String(d.body)}`)
      if (d.outcome) lines.push(`> **Expected result:** ${String(d.outcome)}`)
      lines.push("")
    }
  }
  return lines.join("\n") + "\n"
}

// Rewrite (or remove) the README.md for a route path from current DB state.
export async function syncRouteReadme(path: string): Promise<void> {
  const reqs = await db.prepare("SELECT * FROM requested_routes").all()
  const decl = reqs.find(r => hrefOf(r as Row) === path) as Row | undefined
  const project = path.startsWith("/project/")
    ? (await db.prepare("SELECT * FROM projects WHERE slug = ?").get(path.slice("/project/".length)) as Row | null)
    : null
  const tasks = await db.prepare(
    "SELECT * FROM route_tasks WHERE path = ? AND status = 'open' ORDER BY created_at ASC"
  ).all(path) as Row[]

  if (!decl && !project && tasks.length === 0) {
    await removeRouteReadme(path)
    return
  }
  const dir = routeDir(path)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, "README.md"), renderReadme(path, decl ?? null, project, tasks), "utf8")
}

export async function removeRouteReadme(path: string): Promise<void> {
  try { await rm(join(routeDir(path), "README.md")) } catch {}
}
