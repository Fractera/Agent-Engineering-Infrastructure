import { readdir, readFile, writeFile, mkdir, rm, stat } from "fs/promises"
import { join, resolve } from "path"

// Development steps are REAL markdown files on disk — one per step — under
// DEVELOPMENT-STEPS/ at the project root (next to GLOSSARY.md), exactly like the
// architecture README.md (step 108) and the glossary file (step 107). The file is
// the single source of truth (no DB): an agent reads/writes it, and the
// /development-steps page reads/writes it via read-modify-write of the whole file.
// A hidden machine block keeps the structured fields round-trippable; the markdown
// body above it is what an agent reads.

export type Importance = "optional" | "mandatory" | "critical"
export type StepTask = { id: string; body: string }
export type StepStatus = "new" | "completed"

export type Step = {
  id: string            // base64url of rel path within DEVELOPMENT-STEPS/
  rel: string           // "NEW-STEPS/07-foo.md"
  number: number
  name: string
  importance: Importance
  status: StepStatus
  completedAt: string | null
  description: string
  tasks: StepTask[]
  mtime: string
}

export const ROOT = "DEVELOPMENT-STEPS"
export const NEW_DIR = "NEW-STEPS"
export const DONE_DIR = "COMPLETED-STEPS"

const META_OPEN = "<!-- fractera:step"
const META_CLOSE = "-->"

function rootDir(): string { return resolve(process.cwd(), ROOT) }
function dirFor(status: StepStatus): string {
  return join(rootDir(), status === "completed" ? DONE_DIR : NEW_DIR)
}
function absFromRel(rel: string): string {
  const abs = resolve(rootDir(), rel)
  if (abs !== rootDir() && !abs.startsWith(rootDir() + "/") && !abs.startsWith(rootDir() + "\\")) {
    throw new Error("path escapes DEVELOPMENT-STEPS root")
  }
  return abs
}

export function encodeId(rel: string): string {
  return Buffer.from(rel.replace(/\\/g, "/"), "utf8").toString("base64url")
}
export function decodeId(id: string): string {
  return Buffer.from(id, "base64url").toString("utf8")
}

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50)
}
function pad(n: number): string { return String(n).padStart(2, "0") }

// ---- render (structured → markdown + machine block) --------------------------
function render(s: Step): string {
  const lines: string[] = []
  lines.push(`# ${pad(s.number)} — ${s.name}`, "")
  lines.push(`> Development step · importance: ${s.importance}` + (s.status === "completed" && s.completedAt ? ` · completed ${s.completedAt}` : ""), "")
  lines.push(s.description || "_No description yet._", "")
  lines.push("## To-do")
  if (s.tasks.length === 0) lines.push("_No tasks._")
  else for (const t of s.tasks) lines.push(`- ${t.body}`)
  lines.push("")
  const machine = {
    number: s.number, name: s.name, importance: s.importance, status: s.status,
    completedAt: s.completedAt, description: s.description, tasks: s.tasks,
  }
  return `${lines.join("\n")}\n${META_OPEN}\n${JSON.stringify(machine)}\n${META_CLOSE}\n`
}

function parse(rel: string, text: string, mtime: string): Step {
  const status: StepStatus = rel.startsWith(DONE_DIR) ? "completed" : "new"
  const base: Step = {
    id: encodeId(rel), rel, number: 0, name: rel, importance: "optional",
    status, completedAt: null, description: "", tasks: [], mtime,
  }
  const start = text.indexOf(META_OPEN)
  if (start >= 0) {
    const end = text.indexOf(META_CLOSE, start)
    try {
      const d = JSON.parse(text.slice(start + META_OPEN.length, end).trim())
      return {
        ...base,
        number: Number(d.number) || 0,
        name: String(d.name ?? base.name),
        importance: (["optional", "mandatory", "critical"].includes(d.importance) ? d.importance : "optional") as Importance,
        status: d.status === "completed" ? "completed" : status,
        completedAt: d.completedAt ?? null,
        description: String(d.description ?? ""),
        tasks: Array.isArray(d.tasks) ? d.tasks : [],
      }
    } catch { /* fall through */ }
  }
  base.name = (text.match(/^#\s+(?:\d+\s+—\s+)?(.+)$/m)?.[1] ?? base.name).trim()
  return base
}

// ---- read / list -------------------------------------------------------------
async function listDir(status: StepStatus): Promise<Step[]> {
  const dir = dirFor(status)
  let names: string[]
  try { names = await readdir(dir) } catch { return [] }
  const out: Step[] = []
  for (const name of names) {
    if (!name.endsWith(".md")) continue
    const rel = `${status === "completed" ? DONE_DIR : NEW_DIR}/${name}`
    try {
      const text = await readFile(join(dir, name), "utf8")
      const st = await stat(join(dir, name)).catch(() => null)
      out.push(parse(rel, text, st ? String(Math.round(st.mtimeMs)) : ""))
    } catch { /* skip unreadable */ }
  }
  return out
}

export async function listSteps(): Promise<{ new: Step[]; completed: Step[] }> {
  const [n, c] = await Promise.all([listDir("new"), listDir("completed")])
  const byNum = (a: Step, b: Step) => a.number - b.number
  return { new: n.sort(byNum), completed: c.sort(byNum) }
}

export async function readStep(id: string): Promise<Step | null> {
  const rel = decodeId(id)
  try {
    const abs = absFromRel(rel)
    const text = await readFile(abs, "utf8")
    const st = await stat(abs).catch(() => null)
    return parse(rel, text, st ? String(Math.round(st.mtimeMs)) : "")
  } catch { return null }
}

export async function nextNumber(): Promise<number> {
  const { new: n, completed: c } = await listSteps()
  return Math.max(0, ...n.map(s => s.number), ...c.map(s => s.number)) + 1
}

// ---- mutations (read-modify-write the whole file) ----------------------------
export async function createStep(name: string, importance: Importance): Promise<Step> {
  const number = await nextNumber()
  const rel = `${NEW_DIR}/${pad(number)}-${slugify(name) || "step"}.md`
  const step: Step = {
    id: encodeId(rel), rel, number, name: name.trim(), importance,
    status: "new", completedAt: null, description: "", tasks: [], mtime: "",
  }
  await mkdir(dirFor("new"), { recursive: true })
  await writeFile(absFromRel(rel), render(step), "utf8")
  return step
}

export async function updateStep(id: string, patch: Partial<Pick<Step, "name" | "description" | "importance" | "tasks">>): Promise<Step | null> {
  const cur = await readStep(id)
  if (!cur || cur.status !== "new") return cur && cur.status !== "new" ? null : null
  const next: Step = { ...cur, ...patch }
  await writeFile(absFromRel(cur.rel), render(next), "utf8")
  return next
}

export async function writeRawStep(id: string, raw: string): Promise<boolean> {
  const cur = await readStep(id)
  if (!cur || cur.status !== "new") return false
  await writeFile(absFromRel(cur.rel), raw, "utf8")
  return true
}

export async function deleteStep(id: string): Promise<boolean> {
  const cur = await readStep(id)
  if (!cur || cur.status !== "new") return false
  try { await rm(absFromRel(cur.rel)) } catch {}
  return true
}

export async function readRaw(id: string): Promise<string | null> {
  const rel = decodeId(id)
  try { return await readFile(absFromRel(rel), "utf8") } catch { return null }
}
