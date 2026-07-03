import { slotRoot } from "@/lib/slot-root"
import { readdir, readFile, stat } from "fs/promises"
import { resolve, join } from "path"
import type { ArchNode } from "./types"

// Server-only builder that turns the static "Skills" groups of the /ai-core tree into
// a LIVE mirror of the real skill files on disk — the same idea buildDocsNode() uses
// for the Documentation corpus. Until now each platform's Skills group held an empty
// array (builders.ts) and Hermes' skills were hardcoded leaves (hermes-node.ts), so a
// real skill like .claude/skills/scaffold-declared-route-into-component-skeleton never showed up. This reads the disk.
// View-only: it lists what is there and tags each leaf with a skillRef the detail panel
// uses to fetch the full text. It writes nothing.

// One coding platform's skills location. Key = the /ai-core platform id (the prefix of
// its "<id>-skills" group); `agent` = the matching AI-DRAFT-SETTINGS agent id (so the
// "+" can deep-link a draft); `dir` = where that CLI actually loads PROJECT skills from
// (verified against docs/platforms/<cli>/skills.md). All CLIs share the same SKILL.md
// format. Codex + Kimi read the vendor-neutral ".agents/skills" (open agent-skills
// standard); Claude/Gemini/Qwen read their own ".<vendor>/skills". The one canonical
// skill lives in ".agents/skills/<name>" and the vendor dirs symlink to it — so a single
// skill shows under every agent without maintaining copies.
const CODER_SKILL_DIRS: Record<string, { agent: string; dir: string }> = {
  claude: { agent: "claude-code", dir: ".claude/skills" },
  codex: { agent: "codex", dir: ".agents/skills" },
  gemini: { agent: "gemini-cli", dir: ".gemini/skills" },
  qwen: { agent: "qwen-code", dir: ".qwen/skills" },
  kimi: { agent: "kimi-code", dir: ".agents/skills" },
}

// platform id -> draft-agent id, for stamping addTo on Skills / MCP groups.
const PLATFORM_AGENT: Record<string, string> = {
  ...Object.fromEntries(Object.entries(CODER_SKILL_DIRS).map(([p, v]) => [p, v.agent])),
  hermes: "hermes",
}

// Where each CLI declares its MCP servers (project scope), verified against
// docs/platforms/*/mcp.md. Four are JSON with an `mcpServers` object; Codex is TOML
// with `[mcp_servers.<name>]` tables. We read these to mirror the real MCP wiring under
// each agent's MCP group on /ai-core (same idea as skills — show what's really on disk).
const MCP_CONFIGS: Record<string, { file: string; format: "json" | "toml" }> = {
  claude: { file: ".mcp.json", format: "json" },
  codex: { file: ".codex/config.toml", format: "toml" },
  gemini: { file: ".gemini/settings.json", format: "json" },
  qwen: { file: ".qwen/settings.json", format: "json" },
  kimi: { file: ".kimi/mcp.json", format: "json" },
}

// Hermes loads its skills from the SAME canonical shape as the coders now: a directory
// <name>/SKILL.md with YAML frontmatter (step 137 — a flat <name>.md is never discovered
// by Hermes' own loader). Same allow-list lib/ai-draft/originals.ts reads (prod path, dev
// relative path, the running agent's home). Legacy flat *.md is still tolerated on read so
// an older server keeps mirroring.
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
  return resolve(slotRoot(), entry.dir, name, "SKILL.md")
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
  const abs = resolve(slotRoot(), entry.dir)
  let dirents
  try { dirents = await readdir(abs, { withFileTypes: true }) } catch { return [] }
  const out: ArchNode[] = []
  // Select a skill by whether <name>/SKILL.md is readable — NOT by e.isDirectory().
  // A skill dir may be a SYMLINK (we keep one canonical skill in .agents/skills and
  // symlink the vendor dirs to it), and Dirent.isDirectory() is false for a symlink, so
  // an isDirectory() filter silently drops every symlinked skill (Claude/Gemini/Qwen).
  // readFile follows the link, so this works for real dirs and symlinks alike.
  for (const d of dirents.filter(e => !e.name.startsWith(".")).sort((a, b) => a.name.localeCompare(b.name))) {
    let content: string
    try { content = await readFile(join(abs, d.name, "SKILL.md"), "utf8") } catch { continue }
    const fm = frontmatter(content)
    out.push(skillLeaf(platform, entry.agent, fm.name || d.name, fm.description || ""))
  }
  return out
}

// Hermes' skills are now <name>/SKILL.md with frontmatter (step 137) — mirror them the same
// way as the coders. A legacy flat <name>.md (older servers) still shows: name = filename,
// description = first prose line. Uses the first hermes dir that exists.
async function scanHermesSkills(): Promise<ArchNode[]> {
  for (const dir of hermesSkillDirs(slotRoot())) {
    try { await stat(dir) } catch { continue }
    let dirents
    try { dirents = await readdir(dir, { withFileTypes: true }) } catch { continue }
    const out: ArchNode[] = []
    for (const d of dirents.filter(e => !e.name.startsWith(".")).sort((a, b) => a.name.localeCompare(b.name))) {
      // Canonical: <name>/SKILL.md with frontmatter (a symlink resolves via readFile too).
      try {
        const content = await readFile(join(dir, d.name, "SKILL.md"), "utf8")
        const fm = frontmatter(content)
        out.push(skillLeaf("hermes", "hermes", fm.name || d.name, fm.description || ""))
        continue
      } catch { /* not a skill dir — fall through to legacy flat */ }
      // Legacy: flat <name>.md (no frontmatter) — keep older servers mirroring.
      if (d.name.endsWith(".md")) {
        const name = d.name.replace(/\.md$/, "")
        let desc = ""
        try { desc = firstProse(await readFile(join(dir, d.name), "utf8")) } catch { /* keep empty */ }
        out.push(skillLeaf("hermes", "hermes", name, desc))
      }
    }
    return out
  }
  return []
}

async function skillsFor(platform: string): Promise<ArchNode[]> {
  return platform === "hermes" ? scanHermesSkills() : scanCoderSkills(platform)
}

// One MCP server's one-line summary for the detail panel: its optional description plus
// the transport (HTTP url or stdio command + args). MCP entries have no standard
// description field; when our config includes one we surface it.
function mcpSummary(def: Record<string, unknown>): string {
  const args = Array.isArray(def.args) ? ` ${def.args.join(" ")}`
    : typeof def.args === "string" ? ` ${def.args}` : ""
  const transport = typeof def.url === "string" ? `HTTP · ${def.url}`
    : typeof def.command === "string" ? `stdio · ${def.command}${args}`
    : "MCP server"
  const desc = typeof def.description === "string" ? `${def.description} ` : ""
  return `${desc}(${transport})`
}

function mcpLeaf(platform: string, name: string, def: Record<string, unknown>): ArchNode {
  return {
    id: `${platform}-mcp-${name}`,
    label: name,
    kind: "mcp",
    description: mcpSummary(def),
    // The full server definition, shown in the panel's scrollable container (like a
    // skill's SKILL.md) so the node has a real body, not just a title + one-liner.
    content: JSON.stringify({ [name]: def }, null, 2),
  }
}

// JSON configs (claude/gemini/qwen/kimi): the `mcpServers` object, name -> definition.
function jsonMcpNodes(platform: string, text: string): ArchNode[] {
  let obj: { mcpServers?: Record<string, Record<string, unknown>> }
  try { obj = JSON.parse(text) } catch { return [] }
  const servers = obj?.mcpServers
  if (!servers || typeof servers !== "object") return []
  return Object.keys(servers).sort().map(name => mcpLeaf(platform, name, servers[name] ?? {}))
}

// Codex TOML: minimal line reader for `[mcp_servers.<name>]` tables and their scalar keys
// (enough for display — url / command / args / description). Not a full TOML parser.
function tomlMcpNodes(platform: string, text: string): ArchNode[] {
  const out: ArchNode[] = []
  let cur: { name: string; def: Record<string, unknown> } | null = null
  const flush = () => { if (cur) out.push(mcpLeaf(platform, cur.name, cur.def)) }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    const head = line.match(/^\[mcp_servers\.([A-Za-z0-9_-]+)\]$/)
    if (head) { flush(); cur = { name: head[1], def: {} }; continue }
    if (line.startsWith("[")) { flush(); cur = null; continue }
    if (cur) {
      const kv = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/)
      if (kv) cur.def[kv[1]] = kv[2].trim().replace(/^"(.*)"$/, "$1")
    }
  }
  flush()
  return out
}

async function scanMcp(platform: string): Promise<ArchNode[]> {
  const cfg = MCP_CONFIGS[platform]
  if (!cfg) return []
  let text: string
  try { text = await readFile(resolve(slotRoot(), cfg.file), "utf8") } catch { return [] }
  return cfg.format === "toml" ? tomlMcpNodes(platform, text) : jsonMcpNodes(platform, text)
}

// An instruction-doc leaf gets an "edit" pencil that opens its draft. The 5 platform
// docs are "<platform>-doc" (label = the filename); Hermes' identity doc is "hermes-soul".
// The deep-link target is the /ai-core label; the draft page tolerates a mismatch (e.g.
// Kimi shows AGENTS.md but its seeded instruction is KIMI.md) by falling back to the
// agent's sole instruction. config.yaml / HERMES.md are not exposed here.
function editTarget(node: ArchNode): ArchNode["editTo"] | null {
  if (node.id === "hermes-soul") return { agent: "hermes", object: "instruction", target: "SOUL.md" }
  if (node.kind === "config" && node.id.endsWith("-doc")) {
    const platform = node.id.slice(0, -"-doc".length)
    const agent = PLATFORM_AGENT[platform]
    if (agent) return { agent, object: "instruction", target: node.label }
  }
  return null
}

// Walk the seed tree and, in place of the static stubs, drop in the real skills; stamp
// addTo on every add-able Skills / MCP group so "+" deep-links a draft, and editTo on
// each instruction doc so its pencil opens the draft. Returns a new tree.
export async function enrichSkills(tree: ArchNode): Promise<ArchNode> {
  async function visit(node: ArchNode): Promise<ArchNode> {
    let next: ArchNode = node
    const skillsPlatform = node.kind === "group" && node.id.endsWith("-skills") ? node.id.slice(0, -"-skills".length) : null
    const mcpPlatform = node.kind === "group" && node.id.endsWith("-mcp") ? node.id.slice(0, -"-mcp".length) : null

    if (skillsPlatform && PLATFORM_AGENT[skillsPlatform]) {
      next = { ...next, children: await skillsFor(skillsPlatform), addTo: { agent: PLATFORM_AGENT[skillsPlatform], object: "skills" } }
    } else if (mcpPlatform && PLATFORM_AGENT[mcpPlatform]) {
      // Only the 5 coding CLIs read MCP from a config file; Hermes' MCP group is its
      // hardcoded 7 loopback bridges (real processes, not in a .mcp.json) — keep those.
      const children = MCP_CONFIGS[mcpPlatform] ? await scanMcp(mcpPlatform) : node.children
      next = { ...next, children, addTo: { agent: PLATFORM_AGENT[mcpPlatform], object: "mcp" } }
    } else {
      const editTo = editTarget(node)
      if (editTo) next = { ...next, editTo }
    }

    if (next.children?.length) {
      next = { ...next, children: await Promise.all(next.children.map(visit)) }
    }
    return next
  }
  return visit(tree)
}
