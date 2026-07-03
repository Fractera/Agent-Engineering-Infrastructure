import { mkdir, writeFile, readFile, rm, rmdir } from "fs/promises"
import { join } from "path"
import { routeDir } from "./source-bundle"

// The architecture three streams (projects / pages / endpoints) are backed by
// REAL files on disk — one README.md per entity folder under app/app/<path>/ —
// exactly like the workspace glossary is GLOSSARY.md (lib/glossary-file.ts). The
// README is the single source of truth (no DB): the agent reads it directly, and
// the /architecture editor reads/writes it via read-modify-write of the whole
// file. A hidden machine block keeps the structured fields round-trippable; the
// markdown body above it is what an agent reads.

export type Query = { key: string; value: string }
export type Task = { id: string; kind: "todo" | "delete"; body: string; outcome?: string | null }
export type RouteMeta = {
  path: string
  title: string
  kind: "page" | "api"
  base: string
  dynamic: boolean
  query: Query[]
  description?: string | null
  tasks: Task[]
}

const META_OPEN = "<!-- fractera:meta"
const META_CLOSE = "-->"

// ---- id helpers (filesystem-native, URL/segment-safe, opaque to the UI) ------
// A path carries slashes, which can't be a single [id] route segment — encode it.
export function encodePath(path: string): string {
  return "fs:" + Buffer.from(path, "utf8").toString("base64url")
}
export function decodePath(token: string): string {
  const raw = token.startsWith("fs:") ? token.slice(3) : token
  return Buffer.from(raw, "base64url").toString("utf8")
}
export function taskClientId(path: string, taskId: string): string {
  return Buffer.from(path, "utf8").toString("base64url") + "~" + taskId
}
export function parseTaskClientId(token: string): { path: string; taskId: string } {
  const i = token.indexOf("~")
  const p = i < 0 ? token : token.slice(0, i)
  return { path: Buffer.from(p, "base64url").toString("utf8"), taskId: i < 0 ? "" : token.slice(i + 1) }
}

// ---- path → minimal meta (for a live route getting its first task) -----------
export function metaFromPath(path: string): RouteMeta {
  const segs = path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean)
  const last = segs[segs.length - 1] ?? ""
  const dynamic = last.startsWith("[") && last.endsWith("]")
  const base = "/" + segs.slice(0, -1).join("/")
  return {
    path,
    title: last || path,
    kind: path.startsWith("/api") ? "api" : "page",
    base: base === "/" ? "/" : base,
    dynamic,
    query: [],
    tasks: [],
  }
}

// ---- render (structured → markdown + machine block) --------------------------
function renderBody(m: RouteMeta): string {
  const kind = m.kind === "api" ? "endpoint" : m.path.startsWith("/project/") ? "project" : "page"
  const todos = m.tasks.filter(t => t.kind !== "delete")
  const dels = m.tasks.filter(t => t.kind === "delete")
  const lines: string[] = []
  lines.push(`# ${m.title}`, "")
  lines.push(`> Declared via the Architecture page. This README is the record an agent reads`)
  lines.push(`> to pick up the work below and build / change / remove this ${kind}.`, "")
  lines.push(`- **Path:** \`${m.path}\``)
  lines.push(`- **Kind:** ${kind}`)
  if (m.description) lines.push(`- **Description:** ${m.description}`)
  lines.push("")
  if (m.query.length) {
    lines.push("## Query params")
    for (const p of m.query) lines.push(`- \`${p.key}\` = ${p.value || "—"}`)
    lines.push("")
  }
  lines.push("## To-do (for the agent)")
  if (todos.length === 0) lines.push("_No open tasks._")
  else for (const t of todos) lines.push(`- ${t.body}`)
  lines.push("")
  if (dels.length) {
    lines.push("## Deletion request")
    for (const d of dels) {
      lines.push(`> **Reason:** ${d.body}`)
      if (d.outcome) lines.push(`> **Expected result:** ${d.outcome}`)
      lines.push("")
    }
  }
  return lines.join("\n")
}

function render(m: RouteMeta): string {
  const machine = { title: m.title, kind: m.kind, base: m.base, dynamic: m.dynamic, query: m.query, description: m.description ?? null, tasks: m.tasks }
  return `${renderBody(m)}\n${META_OPEN}\n${JSON.stringify(machine)}\n${META_CLOSE}\n`
}

// ---- read / write ------------------------------------------------------------
export async function readRouteMeta(path: string): Promise<RouteMeta | null> {
  let text = ""
  try { text = await readFile(join(routeDir(path), "README.md"), "utf8") } catch { return null }
  const start = text.indexOf(META_OPEN)
  if (start >= 0) {
    const end = text.indexOf(META_CLOSE, start)
    const json = text.slice(start + META_OPEN.length, end).trim()
    try {
      const d = JSON.parse(json)
      return {
        path,
        title: String(d.title ?? path),
        kind: d.kind === "api" ? "api" : "page",
        base: String(d.base ?? "/"),
        dynamic: !!d.dynamic,
        query: Array.isArray(d.query) ? d.query : [],
        description: d.description ?? null,
        tasks: Array.isArray(d.tasks) ? d.tasks : [],
      }
    } catch { /* fall through to body parse */ }
  }
  // Fallback: a human-authored README without a machine block.
  const m = metaFromPath(path)
  m.title = (text.match(/^#\s+(.+)$/m)?.[1] ?? m.title).trim()
  return m
}

export async function writeRouteMeta(m: RouteMeta): Promise<void> {
  const dir = routeDir(m.path)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, "README.md"), render(m), "utf8")
}

export async function removeRouteReadme(path: string): Promise<void> {
  const dir = routeDir(path)
  try { await rm(join(dir, "README.md")) } catch {}
  // Drop the folder too if the declaration left it empty (no built file).
  try { await rmdir(dir) } catch {}
}

// ---- task mutations (read-modify-write the whole file) -----------------------
export async function addTask(path: string, t: { kind?: string; body: string; outcome?: string | null }): Promise<Task> {
  const m = (await readRouteMeta(path)) ?? metaFromPath(path)
  const task: Task = {
    id: crypto.randomUUID(),
    kind: t.kind === "delete" ? "delete" : "todo",
    body: t.body.trim(),
    outcome: t.outcome ? String(t.outcome).trim() : null,
  }
  m.tasks.push(task)
  await writeRouteMeta(m)
  return task
}

export async function removeTask(path: string, taskId: string): Promise<void> {
  const m = await readRouteMeta(path)
  if (!m) return
  m.tasks = m.tasks.filter(t => t.id !== taskId)
  await writeRouteMeta(m)
}

export async function clearTasks(path: string): Promise<void> {
  const m = await readRouteMeta(path)
  if (!m) return
  m.tasks = []
  await writeRouteMeta(m)
}
