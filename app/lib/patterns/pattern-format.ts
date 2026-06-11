// Format + data layer for patterns/anti-patterns. Pure (no fs): types, the seed
// category catalogue, id codec, and the markdown <-> structured round-trip. The
// hidden machine block (<!-- fractera:pattern … -->) is the source of truth for the
// structured fields; the markdown body above it is what an agent reads. Mirrors the
// development-steps file format (step 109).

export type PatternKind = "pattern" | "anti"
export type PatternStatus = "declared" | "stable"
export type PatternTask = { id: string; body: string }

export type Pattern = {
  id: string            // base64url of rel path within PATTERNS/
  rel: string           // "PATTERNS/ui-elements/01-foo.md" | "ANTI-PATTERNS/02-bar.md"
  kind: PatternKind
  category: string      // category slug for patterns; "" for anti-patterns
  number: number
  name: string          // short title (≤2 words by convention)
  status: PatternStatus
  declared: boolean     // status === "declared" → orange label
  pending: boolean      // declared || tasks.length > 0 → orange (req) badge
  description: string
  code: string          // the reusable code example (the pattern's payload)
  tasks: PatternTask[]
  mtime: string
}

export type Category = { slug: string; label: string }

export const ROOT = "PATTERNS"
export const PAT_DIR = "PATTERNS"        // PATTERNS/PATTERNS/<category>/
export const ANTI_DIR = "ANTI-PATTERNS"  // PATTERNS/ANTI-PATTERNS/

// Seed categories — the AI files each reusable pattern under one of these. The full
// list is extended later as a separate step. Pure data (exempt from the 200-line rule).
export const CATEGORIES: Category[] = [
  { slug: "ui-elements", label: "UI Elements" },
  { slug: "sections", label: "Sections" },
  { slug: "brandbook", label: "Brandbook" },
]

const META_OPEN = "<!-- fractera:pattern"
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

export function labelFor(slug: string): string {
  const c = CATEGORIES.find(x => x.slug === slug)
  if (c) return c.label
  return slug.replace(/-/g, " ").replace(/\b\w/g, m => m.toUpperCase())
}

function relParts(rel: string): { kind: PatternKind; category: string } {
  const norm = rel.replace(/\\/g, "/")
  if (norm.startsWith(ANTI_DIR + "/")) return { kind: "anti", category: "" }
  const seg = norm.split("/") // PATTERNS/<category>/<file>
  return { kind: "pattern", category: seg.length >= 3 ? seg[1] : "" }
}

export function render(p: Pattern): string {
  const lines: string[] = []
  lines.push(`# ${p.name}`, "")
  const kindLabel = p.kind === "anti" ? "Anti-pattern" : `Pattern · ${labelFor(p.category)}`
  lines.push(`> ${kindLabel} · ${p.status}`, "")
  lines.push(p.description || "_No description yet._", "")
  lines.push("## Source code example", "")
  lines.push("```", p.code || "// no example yet", "```", "")
  lines.push("## Steps")
  if (p.tasks.length === 0) lines.push("_No tasks._")
  else for (const t of p.tasks) lines.push(`- ${t.body}`)
  lines.push("")
  const machine = {
    kind: p.kind, category: p.category, number: p.number, name: p.name,
    status: p.status, description: p.description, code: p.code, tasks: p.tasks,
  }
  return `${lines.join("\n")}\n${META_OPEN}\n${JSON.stringify(machine)}\n${META_CLOSE}\n`
}

export function parse(rel: string, text: string, mtime: string): Pattern {
  const { kind, category } = relParts(rel)
  const base: Pattern = {
    id: encodeId(rel), rel, kind, category, number: 0, name: rel,
    status: "stable", declared: false, pending: false,
    description: "", code: "", tasks: [], mtime,
  }
  const start = text.indexOf(META_OPEN)
  if (start >= 0) {
    const end = text.indexOf(META_CLOSE, start)
    try {
      const d = JSON.parse(text.slice(start + META_OPEN.length, end).trim())
      const status: PatternStatus = d.status === "declared" ? "declared" : "stable"
      const tasks: PatternTask[] = Array.isArray(d.tasks) ? d.tasks : []
      return {
        ...base,
        number: Number(d.number) || 0,
        name: String(d.name ?? base.name),
        kind: d.kind === "anti" ? "anti" : kind,
        category: String(d.category ?? category),
        status,
        declared: status === "declared",
        pending: status === "declared" || tasks.length > 0,
        description: String(d.description ?? ""),
        code: String(d.code ?? ""),
        tasks,
      }
    } catch { /* fall through to title-only parse */ }
  }
  base.name = (text.match(/^#\s+(.+)$/m)?.[1] ?? base.name).trim()
  return base
}
