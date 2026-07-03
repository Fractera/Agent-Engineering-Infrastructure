// The six agents AI Draft Settings mirrors, in fixed top-to-bottom order, with the
// REAL originals each one has — the instruction doc(s) it reads, plus the real skills
// and MCP servers. The left tree shows these as read-only reference, and a draft
// (supplement / replace) is laid over one of them or added as a new record. The real
// skills/MCP match the /ai-core catalogue (lib/architecture/hermes-node.ts): only
// Hermes ships skills/bridges today; the five coding platforms have none yet, so their
// SKILLS/MCP groups start empty until a draft is added. Pure data (CLAUDE.md §12).

export type AgentDoc = { name: string }                     // instruction file seeded in the mirror
export type AgentSkill = { name: string }                   // a real skill (name === label)
export type AgentMcp = { name: string; label: string }      // a real MCP server (id + display)

export type AgentDef = {
  id: string        // stable agent id, used in the draft machine block
  folder: string    // folder under AI-DRAFT-SETTINGS/
  label: string     // display name
  docs: AgentDoc[]  // instruction documents seeded as drafts (Hermes has two)
  skills: AgentSkill[]
  mcp: AgentMcp[]
}

export const AGENTS: AgentDef[] = [
  {
    id: "hermes",
    folder: "HERMES",
    label: "Hermes",
    docs: [{ name: "SOUL.md" }, { name: "HERMES.md" }],
    skills: [
      { name: "delegate-task" },
      { name: "record-deployment" },
      { name: "choose-agent" },
    ],
    mcp: [
      { name: "claude-bridge", label: "claude-bridge :3210" },
      { name: "codex-bridge", label: "codex-bridge :3211" },
      { name: "gemini-bridge", label: "gemini-bridge :3212" },
      { name: "qwen-bridge", label: "qwen-bridge :3213" },
      { name: "kimi-bridge", label: "kimi-bridge :3214" },
      { name: "deployments-bridge", label: "deployments-bridge :3215" },
      { name: "readiness-bridge", label: "readiness-bridge :3216" },
    ],
  },
  { id: "claude-code", folder: "CLAUDE-CODE", label: "Claude Code", docs: [{ name: "CLAUDE.md" }], skills: [], mcp: [] },
  { id: "codex", folder: "CODEX", label: "Codex", docs: [{ name: "AGENTS.md" }], skills: [], mcp: [] },
  { id: "gemini-cli", folder: "GEMINI-CLI", label: "Gemini CLI", docs: [{ name: "GEMINI.md" }], skills: [], mcp: [] },
  { id: "qwen-code", folder: "QWEN-CODE", label: "Qwen Code", docs: [{ name: "QWEN.md" }], skills: [], mcp: [] },
  { id: "kimi-code", folder: "KIMI-CODE", label: "Kimi Code", docs: [{ name: "KIMI.md" }], skills: [], mcp: [] },
]

export function agentById(id: string): AgentDef | undefined {
  return AGENTS.find(a => a.id === id)
}
export function agentByFolder(folder: string): AgentDef | undefined {
  return AGENTS.find(a => a.folder === folder)
}
