// Format + data layer for AI Draft Settings. Pure (no fs): types, id codec and the
// markdown <-> structured round-trip. A "draft" is a free-form wish the architect
// writes about one agent's real instruction / skill / MCP file — to supplement or
// replace it. The hidden machine block (<!-- fractera:draft … -->) is the source of
// truth for the structured fields; the markdown above it is what an agent reads when
// it later applies the wish to the real file. Mirrors lib/patterns/pattern-format.ts.

export type DraftKind = "instruction" | "skill" | "mcp"
export type DraftMode = "supplement" | "replace"
// MCP access tier — who may call the tool (MCP-REGISTRY §8.3). Source of truth for the
// future manifest row + the leading word of the tool name (§8.1). Only meaningful for
// kind 'mcp'; cumulative: public ⊆ user ⊆ owner.
export type DraftTier = "public" | "user" | "owner"
export const TIERS: DraftTier[] = ["public", "user", "owner"]
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
  tier: DraftTier        // MCP access tier (§8.3) — mcp-only; ignored for skill/instruction
  mutating: boolean      // MCP writes state vs read-only (§8.2 + manifest) — mcp-only
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

// public/user tools live in the public-consultant channel toolset; owner tools in the
// owner-hermes channel (§8.3 п.1 / §8.4). Derived from the tier — never a separate input.
export function tierChannel(tier: DraftTier): string {
  return tier === "owner" ? "owner-hermes" : "public-consultant"
}
// §8.1 naming skeleton — the tier is the leading significant word (slot tools put it
// third). A hint for the architect; the agent that builds the real tool finalizes it.
export function toolNamePreview(tier: DraftTier, name: string): string {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
  return `${tier}_${slug || "area_action_object"}`
}

export function render(d: Draft): string {
  const lines: string[] = []
  lines.push(`# ${d.name}`, "")
  const overlay = d.target ? `${d.mode} → ${d.target}` : `new ${kindLabel(d.kind).toLowerCase()}`
  // For MCP drafts surface the access decision in the human-readable line too, so the
  // agent applying the wish names the tool (§8.1) and registers the manifest row (§8.3)
  // correctly: tier (who may call) + whether it mutates state (§8.2 confirm protocol).
  const access = d.kind === "mcp"
    ? ` · tier: ${d.tier} · ${d.mutating ? "mutating" : "read-only"} · channel: ${tierChannel(d.tier)}`
    : ""
  lines.push(`> Draft · ${kindLabel(d.kind)} · ${overlay}${access}`, "")
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
    agent: d.agent, kind: d.kind, mode: d.mode, target: d.target,
    tier: d.tier, mutating: d.mutating, name: d.name,
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
    target: null, tier: "owner", mutating: true, name: norm, declared: false, pending: false,
    source: "", tasks: [], mtime,
  }
  const start = text.indexOf(META_OPEN)
  if (start >= 0) {
    const end = text.indexOf(META_CLOSE, start)
    try {
      const j = JSON.parse(text.slice(start + META_OPEN.length, end).trim())
      const kind: DraftKind = j.kind === "skill" || j.kind === "mcp" || j.kind === "instruction" ? j.kind : fallbackKind
      const mode: DraftMode = j.mode === "replace" ? "replace" : "supplement"
      const target: string | null = j.target == null ? null : String(j.target)
      const tier: DraftTier = j.tier === "public" || j.tier === "user" || j.tier === "owner" ? j.tier : "owner"
      const mutating = typeof j.mutating === "boolean" ? j.mutating : true
      const tasks: DraftTask[] = Array.isArray(j.tasks) ? j.tasks : []
      const source = String(j.source ?? "")
      return {
        ...base,
        agent: String(j.agent ?? ""),
        kind, mode, target, tier, mutating,
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
