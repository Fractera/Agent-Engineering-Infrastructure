// Format + data layer for AI Draft Settings. Pure (no fs): types, id codec and the
// markdown <-> structured round-trip. A "draft" is a free-form wish the architect
// writes about one agent's real instruction / skill / MCP file — to supplement or
// replace it. The hidden machine block (<!-- fractera:draft … -->) is the source of
// truth for the structured fields; the markdown above it is what an agent reads when
// it later applies the wish to the real file. Mirrors lib/patterns/pattern-format.ts.

export type DraftKind = "instruction" | "skill" | "mcp"
export type DraftMode = "supplement" | "replace"
// A task is either a free-form wish (kind 'todo' — what the agent should do to the
// real file) or a deletion request (kind 'delete', Danger zone), mirroring the
// architecture/patterns tasks. A delete request carries the reason + expected outcome.
export type DraftTask = { id: string; body: string; kind?: "todo" | "delete"; outcome?: string | null }

export type Draft = {
  id: string             // base64url of rel path within AI-DRAFT-SETTINGS/
  rel: string            // "HERMES/SOUL.md" | "HERMES/SKILLS/01-foo.md"
  agent: string          // agent id: "hermes" | "claude-code" | …
  kind: DraftKind
  mode: DraftMode        // supplement | replace — how the agent applies the wish
  target: string | null  // the real original this overlays; null = brand-new record
  name: string           // short title
  declared: boolean      // target === null → orange label (a new record, no original)
  pending: boolean       // declared || tasks.length > 0 || source → orange (req) badge
  source: string         // proposed full file content (seeded from the original, edited by the architect)
  tasks: DraftTask[]
  mtime: string
}

export const ROOT = "AI-DRAFT-SETTINGS"
export const SKILLS_DIR = "SKILLS"
export const MCP_DIR = "MCP"

// Shape of the tree the GET endpoint returns (defined here, in the pure module, so
// client components can import the types without pulling in the fs layer).
export type GroupKind = "skill" | "mcp"
export type RefEntry = { name: string; label: string; draft: Draft | null }  // a real original (+ optional overlay draft)
export type AgentNode = {
  id: string; label: string; folder: string
  instructions: Draft[]
  skills: { refs: RefEntry[]; extras: Draft[] }
  mcp: { refs: RefEntry[]; extras: Draft[] }
}
export type DraftTree = { agents: AgentNode[] }

const META_OPEN = "<!-- fractera:draft"
const META_CLOSE = "-->"

export function encodeId(rel: string): string {
  return Buffer.from(rel.replace(/\\/g, "/"), "utf8").toString("base64url")
}
export function decodeId(id: string): string {
  return Buffer.from(id, "base64url").toString("utf8")
}
export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50)
}
export function pad(n: number): string { return String(n).padStart(2, "0") }

function kindLabel(k: DraftKind): string {
  return k === "instruction" ? "Instruction" : k === "skill" ? "Skill" : "MCP connector"
}

export function render(d: Draft): string {
  const lines: string[] = []
  lines.push(`# ${d.name}`, "")
  const overlay = d.target ? `${d.mode} → ${d.target}` : `new ${kindLabel(d.kind).toLowerCase()}`
  lines.push(`> Draft · ${kindLabel(d.kind)} · ${overlay}`, "")
  lines.push(
    "Free-form wishes for this agent record. An agent reads them and applies the change " +
    "to the real file — this draft is a mirror, the original is never edited here.",
    "",
  )
  const todos = d.tasks.filter(t => t.kind !== "delete")
  const dels = d.tasks.filter(t => t.kind === "delete")
  lines.push("## Wishes")
  if (todos.length === 0) lines.push("_No wishes yet._")
  else for (const t of todos) lines.push(`- ${t.body}`)
  lines.push("")
  if (dels.length) {
    lines.push("## Deletion requests")
    for (const t of dels) lines.push(`- ${t.body}${t.outcome ? ` → ${t.outcome}` : ""}`)
    lines.push("")
  }
  if (d.source.trim()) {
    // The proposed full content of the real file — what the agent should make the
    // original become. The mode (supplement / replace) says how to apply it.
    lines.push("## Proposed source", "", "```", d.source, "```", "")
  }
  const machine = {
    agent: d.agent, kind: d.kind, mode: d.mode, target: d.target, name: d.name,
    source: d.source, tasks: d.tasks,
  }
  return `${lines.join("\n")}\n${META_OPEN}\n${JSON.stringify(machine)}\n${META_CLOSE}\n`
}

export function parse(rel: string, text: string, mtime: string): Draft {
  const norm = rel.replace(/\\/g, "/")
  const seg = norm.split("/")
  const inSkills = seg.includes(SKILLS_DIR)
  const inMcp = seg.includes(MCP_DIR)
  const fallbackKind: DraftKind = inSkills ? "skill" : inMcp ? "mcp" : "instruction"
  const base: Draft = {
    id: encodeId(norm), rel: norm, agent: "", kind: fallbackKind, mode: "supplement",
    target: null, name: norm, declared: false, pending: false, source: "", tasks: [], mtime,
  }
  const start = text.indexOf(META_OPEN)
  if (start >= 0) {
    const end = text.indexOf(META_CLOSE, start)
    try {
      const j = JSON.parse(text.slice(start + META_OPEN.length, end).trim())
      const kind: DraftKind = j.kind === "skill" || j.kind === "mcp" || j.kind === "instruction" ? j.kind : fallbackKind
      const mode: DraftMode = j.mode === "replace" ? "replace" : "supplement"
      const target: string | null = j.target == null ? null : String(j.target)
      const tasks: DraftTask[] = Array.isArray(j.tasks) ? j.tasks : []
      const source = String(j.source ?? "")
      return {
        ...base,
        agent: String(j.agent ?? ""),
        kind, mode, target,
        name: String(j.name ?? base.name),
        declared: target === null,
        pending: target === null || tasks.length > 0 || source.trim().length > 0,
        source,
        tasks,
      }
    } catch { /* fall through to title-only parse */ }
  }
  base.name = (text.match(/^#\s+(.+)$/m)?.[1] ?? base.name).trim()
  return base
}
