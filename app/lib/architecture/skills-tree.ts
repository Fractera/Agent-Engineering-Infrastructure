import { readdir, readFile, stat } from "fs/promises"
import { resolve, join } from "path"
import type { ArchNode } from "./types"

// Server-only builder that turns the static "Skills" groups of the /ai-core tree into
// a LIVE mirror of the real skill files on disk — the same idea buildDocsNode() uses
// for the Documentation corpus. Until now each platform's Skills group held an empty
// array (builders.ts) and Hermes' skills were hardcoded leaves (hermes-node.ts), so a
// real skill like .claude/skills/scaffold-route never showed up. This reads the disk.
// View-only: it lists what is there and tags each leaf with a skillRef the detail panel
// uses to fetch the full text. It writes nothing.

// One coding platform's skills location. Key = the /ai-core platform id (the prefix of
// its "<id>-skills" group); `agent` = the matching AI-DRAFT-SETTINGS agent id (so the
// "+" can deep-link a draft); `dir` = where that platform keeps its skills, relative to
// the app root. Today only Claude Code has a populated dir; the rest render empty until
// they grow one — honest, not a fake placeholder.
const CODER_SKILL_DIRS: Record<string, { agent: string; dir: string }> = {
  claude: { agent: "claude-code", dir: ".claude/skills" },
  codex: { agent: "codex", dir: ".codex/skills" },
  gemini: { agent: "gemini-cli", dir: ".gemini/skills" },
  qwen: { agent: "qwen-code", dir: ".qwen/skills" },
  kimi: { agent: "kimi-code", dir: ".kimi/skills" },
}

// platform id -> draft-agent id, for stamping addTo on Skills / MCP groups.
const PLATFORM_AGENT: Record<string, string> = {
  ...Object.fromEntries(Object.entries(CODER_SKILL_DIRS).map(([p, v]) => [p, v.agent])),
  hermes: "hermes",
}

// Hermes keeps its skills as flat *.md files; same allow-list lib/ai-draft/originals.ts
// reads (prod path, dev relative path, the running agent's home).
function hermesSkillDirs(cwd: string): string[] {
  return [
    "/opt/fractera/services/hermes-skills",
    resolve(cwd, "..", "services/hermes-skills"),
    "/root/.hermes/skills",
  ]
}

// Resolve the real file a coder skill lives in (used by the read-only content API too,
// so the two never drift). Returns null for an unknown agent.
export function coderSkillFile(agent: string, name: string): string | null {
  const entry = Object.values(CODER_SKILL_DIRS).find(v => v.agent === agent)
  if (!entry) return null
  return resolve(process.cwd(), entry.dir, name, "SKILL.md")
}
export { hermesSkillDirs }

// Pull `name` / `description` from a SKILL.md YAML frontmatter (simple single-line values).
function frontmatter(text: string): { name?: string; description?: string } {
  if (!text.startsWith("---")) return {}
  const end = text.indexOf("\n---", 3)
  if (end < 0) return {}
  const out: { name?: string; description?: string } = {}
  for (const line of text.slice(3, end).split("\n")) {
    const m = line.match(/^(name|description):\s*(.+)$/)
    if (m) out[m[1] as "name" | "description"] = m[2].trim().replace(/^["']|["']$/g, "")
  }
  return out
}

function firstProse(text: string): string {
  for (const raw of text.split("\n")) {
    const line = raw.trim()
    if (line && !line.startsWith("#")) return line
  }
  return ""
}

function skillLeaf(platform: string, agent: string, name: string, description: string): ArchNode {
  return {
    id: `${platform}-skill-${name}`,
    label: name,
    kind: "skill",
    description: description || `Skill "${name}". Open to read its full text.`,
    skillRef: { agent, name },
  }
}

// A coder platform whose skills are <dir>/<name>/SKILL.md (the Claude Code convention).
async function scanCoderSkills(platform: string): Promise<ArchNode[]> {
  const entry = CODER_SKILL_DIRS[platform]
  if (!entry) return []
  const abs = resolve(process.cwd(), entry.dir)
  let dirents
  try { dirents = await readdir(abs, { withFileTypes: true }) } catch { return [] }
  const out: ArchNode[] = []
  for (const d of dirents.filter(e => e.isDirectory() && !e.name.startsWith(".")).sort((a, b) => a.name.localeCompare(b.name))) {
    let fm: { name?: string; description?: string } = {}
    try { fm = frontmatter(await readFile(join(abs, d.name, "SKILL.md"), "utf8")) } catch { /* no SKILL.md — still list the dir */ }
    out.push(skillLeaf(platform, entry.agent, fm.name || d.name, fm.description || ""))
  }
  return out
}

// Hermes' skills are flat *.md (no frontmatter); name = filename, description = first prose line.
async function scanHermesSkills(): Promise<ArchNode[]> {
  for (const dir of hermesSkillDirs(process.cwd())) {
    try { await stat(dir) } catch { continue }
    let names
    try { names = await readdir(dir) } catch { continue }
    const out: ArchNode[] = []
    for (const f of names.filter(n => n.endsWith(".md")).sort((a, b) => a.localeCompare(b))) {
      const name = f.replace(/\.md$/, "")
      let desc = ""
      try { desc = firstProse(await readFile(join(dir, f), "utf8")) } catch { /* keep empty */ }
      out.push(skillLeaf("hermes", "hermes", name, desc))
    }
    return out
  }
  return []
}

async function skillsFor(platform: string): Promise<ArchNode[]> {
  return platform === "hermes" ? scanHermesSkills() : scanCoderSkills(platform)
}

// Walk the seed tree and, in place of the static stubs, drop in the real skills; stamp
// addTo on every add-able Skills / MCP group so "+" deep-links a draft. Returns a new tree.
export async function enrichSkills(tree: ArchNode): Promise<ArchNode> {
  async function visit(node: ArchNode): Promise<ArchNode> {
    let next: ArchNode = node
    const skillsPlatform = node.kind === "group" && node.id.endsWith("-skills") ? node.id.slice(0, -"-skills".length) : null
    const mcpPlatform = node.kind === "group" && node.id.endsWith("-mcp") ? node.id.slice(0, -"-mcp".length) : null

    if (skillsPlatform && PLATFORM_AGENT[skillsPlatform]) {
      next = { ...next, children: await skillsFor(skillsPlatform), addTo: { agent: PLATFORM_AGENT[skillsPlatform], object: "skills" } }
    } else if (mcpPlatform && PLATFORM_AGENT[mcpPlatform]) {
      next = { ...next, addTo: { agent: PLATFORM_AGENT[mcpPlatform], object: "mcp" } }
    }

    if (next.children?.length) {
      next = { ...next, children: await Promise.all(next.children.map(visit)) }
    }
    return next
  }
  return visit(tree)
}
