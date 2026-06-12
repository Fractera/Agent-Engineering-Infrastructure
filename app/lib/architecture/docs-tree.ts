import { readdir } from "fs/promises"
import { resolve, join } from "path"
import type { ArchNode } from "./types"
import { readGlossary } from "@/lib/glossary-file"
import { listSteps, type Step } from "@/lib/dev-steps/step-file"
import { listTree as listPatternTree } from "@/lib/patterns/pattern-file"
import { listTree as listDraftTree } from "@/lib/ai-draft/draft-file"
import { scanTree } from "@/lib/crud-docs/fs"
import type { DocNode } from "@/lib/crud-docs/format"
import type { Draft, RefEntry } from "@/lib/ai-draft/draft-format"

// Server-only builder for the "Documentation — Company Memory corpus" branch of the
// /ai-core tree. Instead of the old hardcoded placeholder (docs-node.ts), this reads
// the REAL filesystem at render and mirrors each level — the same idea /architecture
// uses for routes. View-only: every node links to the page that manages it; nothing
// is edited here. Composes the existing scanners (no new fs logic).

function pad(n: number): string { return String(n).padStart(2, "0") }

function glossaryNode(entries: { term: string; meaning: string }[]): ArchNode {
  return {
    id: "doc-glossary", label: "GLOSSARY.md", kind: "config", href: "/glossary",
    description:
      "Project terms — approved abbreviations / preferred phrasings so every agent reads " +
      "them the same way (e.g. aws -> ai-workspace). Real file GLOSSARY.md at the project root.",
    children: entries.map((e, i) => ({
      id: `doc-glossary-${i}`, label: e.term, kind: "note",
      description: e.meaning || "(no definition yet)",
    })),
  }
}

function stepLeaf(s: Step): ArchNode {
  const state = s.status === "completed"
    ? `completed${s.completedAt ? " " + s.completedAt : ""}`
    : "new"
  return {
    id: `doc-step-${s.id}`, label: `${pad(s.number)} — ${s.name}`, kind: "note", href: "/development-steps",
    description: `${s.importance} · ${state}.${s.description ? " " + s.description : ""}`,
  }
}

function stepsNode(steps: { new: Step[]; completed: Step[] }): ArchNode {
  return {
    id: "doc-steps", label: "DEVELOPMENT-STEPS", kind: "group", href: "/development-steps",
    description:
      "The work log — every step of how the app is built, kept as real markdown files an agent " +
      "reads and writes. Files live in DEVELOPMENT-STEPS/ at the project root.",
    children: [
      { id: "doc-new-steps", label: "NEW-STEPS", kind: "group", description: "Open steps — editable.",
        children: steps.new.map(stepLeaf) },
      { id: "doc-completed-steps", label: "COMPLETED-STEPS", kind: "group", description: "Finished steps — read-only history with a completion date.",
        children: steps.completed.map(stepLeaf) },
    ],
  }
}

function patternLeaf(p: { id: string; name: string; kind: string; declared: boolean; pending: boolean; description: string }): ArchNode {
  const tag = p.declared ? "declared" : p.pending ? "stable · open task" : "stable"
  return {
    id: `doc-pattern-${p.id}`, label: p.name, kind: "note", href: "/patterns",
    description: `${p.kind === "anti" ? "Anti-pattern" : "Pattern"} · ${tag}.${p.description ? " " + p.description : ""}`,
    declared: p.declared, pending: p.pending,
  }
}

function patternsNode(tree: Awaited<ReturnType<typeof listPatternTree>>): ArchNode {
  return {
    id: "doc-patterns", label: "PATTERNS", kind: "group", href: "/patterns",
    description:
      "The reuse library — reusable code patterns and deployment anti-patterns, kept as real " +
      "markdown files. Files live in PATTERNS/ at the project root.",
    children: [
      { id: "doc-patterns-patterns", label: "PATTERNS", kind: "group", description: "Reusable code patterns in a one-level tree by category.",
        children: tree.categories.map(c => ({
          id: `doc-pat-cat-${c.slug}`, label: c.label, kind: "group" as const,
          description: `Category: ${c.label}.`,
          children: c.patterns.map(patternLeaf),
        })) },
      { id: "doc-patterns-anti", label: "ANTI-PATTERNS", kind: "group", description: "Deployment pitfalls — a flat list read before every deploy.",
        children: tree.anti.map(patternLeaf) },
    ],
  }
}

function draftLeaf(prefix: string, d: Draft): ArchNode {
  return {
    id: `${prefix}-${d.id}`, label: d.name, kind: "note", href: "/ai-draft-settings",
    description: `${d.kind} draft (${d.mode}${d.target ? " → " + d.target : ", new record"}).`,
    declared: d.declared, pending: d.pending,
  }
}

function refLeaf(prefix: string, r: RefEntry, i: number): ArchNode {
  if (r.draft) return draftLeaf(prefix, r.draft)
  return {
    id: `${prefix}-ref-${i}`, label: r.label, kind: "note", href: "/ai-draft-settings",
    description: "Real original — read-only reference (no draft over it yet).",
  }
}

function aiDraftNode(tree: Awaited<ReturnType<typeof listDraftTree>>): ArchNode {
  return {
    id: "doc-ai-draft", label: "AI-DRAFT-SETTINGS", kind: "group", href: "/ai-draft-settings",
    description:
      "The draft layer — free-form wishes for the six agents' real instruction / skill / MCP files. " +
      "A mirror; an agent applies a draft to the original later. One folder per agent.",
    children: tree.agents.map(a => ({
      id: `doc-ai-draft-${a.id}`, label: a.folder, kind: "group" as const,
      description: `${a.label}: its draft folder — instruction doc(s) + SKILLS/ + MCP/.`,
      children: [
        ...a.instructions.map(d => draftLeaf(`doc-ai-${a.id}-instr`, d)),
        { id: `doc-ai-${a.id}-skills`, label: "SKILLS", kind: "group" as const,
          description: "Draft skills laid over the agent's real skills (read-only refs) or added as new.",
          children: [
            ...a.skills.refs.map((r, i) => refLeaf(`doc-ai-${a.id}-skill`, r, i)),
            ...a.skills.extras.map(d => draftLeaf(`doc-ai-${a.id}-skillx`, d)),
          ] },
        { id: `doc-ai-${a.id}-mcp`, label: "MCP", kind: "group" as const,
          description: "Draft MCP connectors over the agent's real bridges (read-only refs) or added as new.",
          children: [
            ...a.mcp.refs.map((r, i) => refLeaf(`doc-ai-${a.id}-mcp`, r, i)),
            ...a.mcp.extras.map(d => draftLeaf(`doc-ai-${a.id}-mcpx`, d)),
          ] },
      ],
    })),
  }
}

function docNodeToArch(n: DocNode): ArchNode {
  if (n.kind === "folder") {
    return {
      id: `doc-crud-${n.rel}`, label: n.name, kind: "group",
      description: `Folder: CRUD-DOCS/${n.rel}`,
      children: (n.children ?? []).map(docNodeToArch),
    }
  }
  const kb = n.size != null ? ` · ${Math.max(1, Math.round(n.size / 1024))} KB` : ""
  return {
    id: `doc-crud-${n.rel}`, label: n.name, kind: "note",
    description: `${(n.ext || "file").replace(/^\./, "")} document${kb}.`,
  }
}

async function crudDocsNode(): Promise<ArchNode> {
  const tree = await scanTree()
  return {
    id: "doc-crud-docs", label: "CRUD-DOCS", kind: "group", href: "/documents",
    description:
      "Your knowledge-base documents — a real folder/file tree of any depth under CRUD-DOCS/. " +
      "Managed via the /documents page; activating one ingests it into Company Memory (LightRAG).",
    children: tree.map(docNodeToArch),
  }
}

// docs/hermes/ has no scanner of its own (it is a plain folder, no machine block).
async function scanPlain(absDir: string, relPrefix: string, idPrefix: string): Promise<ArchNode[]> {
  let entries
  try { entries = await readdir(absDir, { withFileTypes: true }) } catch { return [] }
  const sorted = entries
    .filter(e => !e.name.startsWith("."))
    .sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1))
  const out: ArchNode[] = []
  for (const e of sorted) {
    const rel = `${relPrefix}/${e.name}`
    if (e.isDirectory()) {
      out.push({ id: `${idPrefix}-${rel}`, label: e.name, kind: "group", description: `Folder: ${rel}`,
        children: await scanPlain(join(absDir, e.name), rel, idPrefix) })
    } else {
      out.push({ id: `${idPrefix}-${rel}`, label: e.name, kind: "note", description: "Hermes private memory file (read-only)." })
    }
  }
  return out
}

async function hermesNode(): Promise<ArchNode> {
  const abs = resolve(process.cwd(), "docs/hermes")
  return {
    id: "doc-hermes", label: "HERMES — private memory (read-only)", kind: "group",
    description:
      "Hermes's closed memory (docs/hermes/) — architectural decisions, project model, feedback history. " +
      "Only Hermes writes here; shown read-only (CLAUDE.md §10). No managing page.",
    children: await scanPlain(abs, "docs/hermes", "doc-hermes"),
  }
}

// The real Documentation corpus, read from disk at render. Replaces the static DOCS_NODE.
export async function buildDocsNode(): Promise<ArchNode> {
  const [glossary, steps, patterns, drafts, crud, hermes] = await Promise.all([
    readGlossary(),
    listSteps(),
    listPatternTree(),
    listDraftTree(),
    crudDocsNode(),
    hermesNode(),
  ])
  return {
    id: "docs", label: "Documentation — Company Memory corpus", kind: "group",
    description:
      "The shared knowledge every agent references and the material that feeds Company Memory " +
      "(LightRAG). A live mirror of the real files on disk — expand a branch to see exactly what " +
      "is there; open a branch's page to read or edit it.",
    children: [glossaryNode(glossary), stepsNode(steps), patternsNode(patterns), aiDraftNode(drafts), crud, hermes],
  }
}
