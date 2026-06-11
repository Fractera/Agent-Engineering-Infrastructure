import { readFile } from "fs/promises"
import { resolve, basename } from "path"
import type { DraftKind } from "./draft-format"

// Resolve and read the REAL original file a draft refers to, read-only — so the Source
// tab can show the current state and seed an edit. We only read a small allowlist of
// known locations (no arbitrary traversal: the target is reduced to a bare filename).
// Many originals live where the agents actually load them; some (Hermes config, skills)
// sit outside the app, so a read may legitimately fail — we report that, not error.

export type OriginalResult = {
  content: string
  readable: boolean
  path: string | null
  language: string
  note?: string
}

function safe(name: string): string {
  return basename(name.replace(/\\/g, "/"))
}

async function firstReadable(paths: string[]): Promise<{ content: string; path: string } | null> {
  for (const p of paths) {
    try { return { content: await readFile(p, "utf8"), path: p } } catch { /* try next */ }
  }
  return null
}

export async function readOriginal(
  _agentId: string, kind: DraftKind, target: string | null,
): Promise<OriginalResult> {
  const language = kind === "mcp" ? "yaml" : "markdown"
  if (!target) {
    return {
      content: "", readable: false, path: null, language,
      note: "New record — there is no original yet. Author the proposed file content here.",
    }
  }
  const cwd = process.cwd()
  const t = safe(target)
  let candidates: string[]
  if (kind === "instruction") {
    candidates = [
      resolve(cwd, t),                                            // app root: CLAUDE.md / AGENTS.md / GEMINI.md / QWEN.md / KIMI.md
      `/root/.hermes/${t}`,                                       // Hermes: SOUL.md / HERMES.md
      resolve(cwd, "docs/HERMES/hermes-agent-main/docker", t),    // seed template fallback
    ]
  } else if (kind === "skill") {
    candidates = [
      `/opt/fractera/services/hermes-skills/${t}.md`,
      resolve(cwd, "..", "services/hermes-skills", `${t}.md`),
      `/root/.hermes/skills/${t}.md`,
    ]
  } else {
    candidates = [
      "/root/.hermes/config.yaml",
      resolve(cwd, "docs/HERMES/hermes-agent-main/docker/config.yaml"),
    ]
  }
  const hit = await firstReadable(candidates)
  if (hit) return { content: hit.content, readable: true, path: hit.path, language }
  return {
    content: "", readable: false, path: null, language,
    note: kind === "mcp"
      ? "The real MCP wiring (Hermes config.yaml) is not reachable from the workspace. Describe the desired connector here."
      : "The original file is not reachable from the workspace. Author the proposed content here.",
  }
}
