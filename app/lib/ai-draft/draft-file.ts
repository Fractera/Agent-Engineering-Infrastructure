import { readdir, readFile, writeFile, mkdir, rm, stat } from "fs/promises"
import { resolve } from "path"
import {
  ROOT, SKILLS_DIR, MCP_DIR,
  type Draft, type DraftKind, type DraftMode,
  type RefEntry, type AgentNode, type DraftTree,
  encodeId, decodeId, slugify, pad, render, parse,
} from "./draft-format"
import { AGENTS, type AgentDef } from "./agents"

// AI Draft Settings is REAL markdown on disk under AI-DRAFT-SETTINGS/ at the project
// root (next to GLOSSARY.md / PATTERNS/), the single source of truth (no DB) — same
// model as patterns (step 110) and the architecture README.md (step 108). Each agent
// folder holds its instruction draft(s) plus SKILLS/ and MCP/ with one file per draft.
// The originals the drafts refer to are NEVER written here — only the wishes are.

function rootDir(): string { return resolve(process.cwd(), ROOT) }
function absFromRel(rel: string): string {
  const abs = resolve(rootDir(), rel)
  if (abs !== rootDir() && !abs.startsWith(rootDir() + "/") && !abs.startsWith(rootDir() + "\\")) {
    throw new Error("path escapes AI-DRAFT-SETTINGS root")
  }
  return abs
}

async function readDraftFile(rel: string): Promise<Draft | null> {
  try {
    const abs = absFromRel(rel)
    const text = await readFile(abs, "utf8")
    const st = await stat(abs).catch(() => null)
    return parse(rel, text, st ? String(Math.round(st.mtimeMs)) : "")
  } catch { return null }
}

async function listDirDrafts(relDir: string): Promise<Draft[]> {
  let names: string[]
  try { names = await readdir(absFromRel(relDir)) } catch { return [] }
  const out: Draft[] = []
  for (const name of names) {
    if (!name.endsWith(".md")) continue
    const d = await readDraftFile(`${relDir}/${name}`)
    if (d) out.push(d)
  }
  return out
}

function seedInstruction(agent: AgentDef, docName: string): Draft {
  const rel = `${agent.folder}/${docName}`
  return {
    id: encodeId(rel), rel, agent: agent.id, kind: "instruction", mode: "supplement",
    target: docName, name: docName, declared: false, pending: false, tasks: [], mtime: "",
  }
}

// Idempotent: create the six agent folders (+ SKILLS/MCP) and seed each instruction
// doc as a draft if it is missing. Called by GET so the page is self-healing.
export async function ensureSkeleton(): Promise<void> {
  for (const agent of AGENTS) {
    await mkdir(absFromRel(`${agent.folder}/${SKILLS_DIR}`), { recursive: true })
    await mkdir(absFromRel(`${agent.folder}/${MCP_DIR}`), { recursive: true })
    for (const doc of agent.docs) {
      const rel = `${agent.folder}/${doc.name}`
      try { await stat(absFromRel(rel)) } catch {
        await writeFile(absFromRel(rel), render(seedInstruction(agent, doc.name)), "utf8")
      }
    }
  }
}

function group(drafts: Draft[], refs: { name: string; label: string }[]): { refs: RefEntry[]; extras: Draft[] } {
  const byTarget = new Map<string, Draft>()
  const extras: Draft[] = []
  for (const d of drafts) {
    if (d.target) byTarget.set(d.target, d)
    else extras.push(d)
  }
  extras.sort((a, b) => a.rel.localeCompare(b.rel))
  return { refs: refs.map(r => ({ name: r.name, label: r.label, draft: byTarget.get(r.name) ?? null })), extras }
}

export async function listTree(): Promise<DraftTree> {
  await ensureSkeleton()
  const agents = await Promise.all(AGENTS.map(async (agent): Promise<AgentNode> => {
    const instructions = (await Promise.all(agent.docs.map(d => readDraftFile(`${agent.folder}/${d.name}`))))
      .filter((d): d is Draft => !!d)
    const skillDrafts = await listDirDrafts(`${agent.folder}/${SKILLS_DIR}`)
    const mcpDrafts = await listDirDrafts(`${agent.folder}/${MCP_DIR}`)
    return {
      id: agent.id, label: agent.label, folder: agent.folder,
      instructions,
      skills: group(skillDrafts, agent.skills.map(s => ({ name: s.name, label: s.name }))),
      mcp: group(mcpDrafts, agent.mcp.map(m => ({ name: m.name, label: m.label }))),
    }
  }))
  return { agents }
}

export async function readDraft(id: string): Promise<Draft | null> {
  return readDraftFile(decodeId(id))
}

async function nextNumber(relDir: string): Promise<number> {
  const drafts = await listDirDrafts(relDir)
  const nums = drafts.map(d => Number(d.rel.split("/").pop()?.match(/^(\d+)/)?.[1] ?? 0))
  return Math.max(0, ...nums) + 1
}

// ---- mutations (read-modify-write the whole file) ----------------------------
export async function createDraft(
  agentId: string, kind: Exclude<DraftKind, "instruction">, name: string,
  mode: DraftMode, target: string | null,
): Promise<Draft | null> {
  const agent = AGENTS.find(a => a.id === agentId)
  if (!agent || !name.trim()) return null
  const dir = kind === "skill" ? SKILLS_DIR : MCP_DIR
  const relDir = `${agent.folder}/${dir}`
  const number = await nextNumber(relDir)
  const slug = slugify(name) || kind
  const rel = `${relDir}/${pad(number)}-${slug}.md`
  const d: Draft = {
    id: encodeId(rel), rel, agent: agent.id, kind, mode, target: target || null,
    name: name.trim(), declared: !target, pending: true, tasks: [], mtime: "",
  }
  await mkdir(absFromRel(relDir), { recursive: true })
  await writeFile(absFromRel(rel), render(d), "utf8")
  return d
}

export async function updateDraft(
  id: string,
  patch: Partial<Pick<Draft, "name" | "mode" | "tasks">>,
): Promise<Draft | null> {
  const cur = await readDraft(id)
  if (!cur) return null
  const next: Draft = { ...cur, ...patch }
  next.declared = next.target === null
  next.pending = next.declared || next.tasks.length > 0
  await writeFile(absFromRel(cur.rel), render(next), "utf8")
  return next
}

export async function deleteDraft(id: string): Promise<boolean> {
  const cur = await readDraft(id)
  if (!cur) return false
  try { await rm(absFromRel(cur.rel)) } catch { /* already gone */ }
  return true
}
