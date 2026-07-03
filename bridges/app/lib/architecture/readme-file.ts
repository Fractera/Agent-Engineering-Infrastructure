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

// Placement & access vocabulary — the SAME words the frozen-pipeline confirm layer
// uses (frozen-templates registry.json confirm.labels): menus top/footer/left/right,
// visibility public / publicGuest / rolesOnly, admin, dashboard. One vocabulary,
// two entry points (Hermes order-sheet and this panel).
export type MenuSlot = "top" | "footer" | "left" | "right"
export type Visibility = "public" | "publicGuest" | "rolesOnly"
// A project's external automation: env keys are RECORDED in the declaration; the
// executor materializes them into app/.env.local via the env setter + rebuild
// (build-time env contract, step 143).
export type Integration = { name: string; envKeys: string[] }

export const MENU_SLOTS: MenuSlot[] = ["top", "footer", "left", "right"]
export const VISIBILITIES: Visibility[] = ["public", "publicGuest", "rolesOnly"]

export type RouteMeta = {
  path: string
  title: string
  kind: "page" | "api"
  base: string
  dynamic: boolean
  query: Query[]
  description?: string | null
  tasks: Task[]
  // Placement & access (both groups). All optional: absent in old READMEs and in
  // endpoint declarations — undefined means "not declared", never a default.
  menus?: MenuSlot[]
  visibility?: Visibility
  roles?: string[]
  admin?: boolean
  dashboard?: boolean
  // Project runtime (declarations under /projects/** only).
  cron?: boolean
  integrations?: Integration[]
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
const MENU_LABEL: Record<MenuSlot, string> = { top: "top menu", footer: "footer", left: "left drawer", right: "right drawer" }

function visibilityLine(m: RouteMeta): string {
  if (m.visibility === "publicGuest") return "everyone (guests get an account on first action)"
  if (m.visibility === "rolesOnly") return `ONLY signed-in with role(s): ${(m.roles ?? []).map(r => `\`${r}\``).join(", ") || "—"}`
  return "EVERYONE (no login)"
}

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
  // Placement & access — declared INTENT. Menu placement here does not add menu
  // entries by itself: the builder agent writes the real rows into the group's
  // _data/group.ts menu manifests when it builds the page.
  if (m.menus !== undefined || m.visibility !== undefined || m.admin !== undefined || m.dashboard !== undefined) {
    lines.push("## Placement & access")
    const menus = m.menus ?? []
    lines.push(`- **Appears in:** ${menus.length ? menus.map(s => MENU_LABEL[s]).join(", ") : "NOWHERE (no menu enabled!)"}`)
    lines.push(`- **Visible to:** ${visibilityLine(m)}`)
    lines.push(`- **Admin panel:** ${m.admin ? "yes" : "no"}`)
    lines.push(`- **User dashboards:** ${m.dashboard ? "yes" : "no"}`)
    if (menus.length) lines.push(`- Menu placement is intent: when building, add the real entries to the group's \`_data/group.ts\` menu manifests.`)
    lines.push("")
  }
  // Project runtime — only for declarations under /projects/**.
  if (m.cron !== undefined || m.integrations !== undefined) {
    lines.push("## Project runtime")
    lines.push(`- **Cron processes:** ${m.cron ? "yes" : "no"}`)
    const ints = m.integrations ?? []
    if (ints.length) {
      lines.push("- **External integrations:**")
      for (const it of ints) {
        const keys = it.envKeys.length ? it.envKeys.map(k => `\`${k}\``).join(", ") : "—"
        lines.push(`  - ${it.name} — env keys: ${keys}`)
      }
      lines.push(`- Env keys are recorded here only; when executing, materialize them into \`app/.env.local\` via the env setter + rebuild (build-time env contract).`)
    } else {
      lines.push("- **External integrations:** none")
    }
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
  // JSON.stringify drops undefined fields, so old-style declarations stay byte-identical.
  const machine = {
    title: m.title, kind: m.kind, base: m.base, dynamic: m.dynamic, query: m.query,
    description: m.description ?? null, tasks: m.tasks,
    menus: m.menus, visibility: m.visibility, roles: m.roles, admin: m.admin, dashboard: m.dashboard,
    cron: m.cron, integrations: m.integrations,
  }
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
        menus: Array.isArray(d.menus) ? d.menus.filter((s: unknown): s is MenuSlot => MENU_SLOTS.includes(s as MenuSlot)) : undefined,
        visibility: VISIBILITIES.includes(d.visibility) ? (d.visibility as Visibility) : undefined,
        roles: Array.isArray(d.roles) ? d.roles.map(String) : undefined,
        admin: typeof d.admin === "boolean" ? d.admin : undefined,
        dashboard: typeof d.dashboard === "boolean" ? d.dashboard : undefined,
        cron: typeof d.cron === "boolean" ? d.cron : undefined,
        integrations: Array.isArray(d.integrations)
          ? d.integrations
              .map((it: { name?: unknown; envKeys?: unknown }) => ({
                name: String(it?.name ?? "").trim(),
                envKeys: Array.isArray(it?.envKeys) ? it.envKeys.map(String).map(s => s.trim()).filter(Boolean) : [],
              }))
              .filter((it: Integration) => it.name)
          : undefined,
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
