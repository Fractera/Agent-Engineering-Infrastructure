import { readFile, writeFile } from "fs/promises"
import { join } from "path"

// The workspace glossary is a REAL file on disk — GLOSSARY.md at the project root
// (the agent working dir), next to CLAUDE.md / AGENTS.md, so any agent reads it
// directly as project context. The /glossary editor reads/writes this file; it is
// the single source of truth (no DB). Same pattern as config routes writing
// .env.local. Stored as a markdown table so it is human- and agent-readable.

export type Entry = { term: string; meaning: string }

const FILE = join(process.cwd(), "GLOSSARY.md")

// Pipes would break the markdown table — replace them in values (terms/meanings
// virtually never contain a literal "|").
function clean(s: unknown): string {
  return String(s ?? "").trim().replace(/\|/g, "/")
}

export async function readGlossary(): Promise<Entry[]> {
  let text = ""
  try { text = await readFile(FILE, "utf8") } catch { return [] }
  const out: Entry[] = []
  for (const line of text.split("\n")) {
    const t = line.trim()
    if (!t.startsWith("|")) continue
    const cells = t.split("|").map(c => c.trim())
    const term = cells[1] ?? ""
    const meaning = cells[2] ?? ""
    if (!term || term.toLowerCase() === "term" || /^-+$/.test(term)) continue
    out.push({ term, meaning })
  }
  return out
}

export async function writeGlossary(entries: Entry[]): Promise<void> {
  const rows = entries.map(e => `| ${clean(e.term)} | ${clean(e.meaning)} |`).join("\n")
  const content =
    `# Glossary\n\n` +
    `> Workspace term map — approved abbreviations and preferred phrasings so every\n` +
    `> agent in this project reads them the same way (e.g. aws -> ai-workspace).\n` +
    `> Edited via the /glossary page; this file is the source of truth.\n\n` +
    `| Term | Meaning |\n|---|---|\n${rows}${rows ? "\n" : ""}`
  await writeFile(FILE, content, "utf8")
}
