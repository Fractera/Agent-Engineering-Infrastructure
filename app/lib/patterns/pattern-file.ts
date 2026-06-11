import { readdir, readFile, writeFile, mkdir, rm, stat } from "fs/promises"
import { resolve } from "path"
import {
  ROOT, PAT_DIR, ANTI_DIR, CATEGORIES,
  type Pattern, type PatternKind,
  encodeId, decodeId, slugify, pad, labelFor, render, parse,
} from "./pattern-format"

// Patterns & anti-patterns are REAL markdown files on disk under PATTERNS/ at the
// project root (next to GLOSSARY.md / DEVELOPMENT-STEPS/), the single source of
// truth (no DB) — same model as development steps (step 109) and the architecture
// README.md (step 108). PATTERNS/PATTERNS/<category>/ holds reusable code patterns
// (a one-level tree); PATTERNS/ANTI-PATTERNS/ holds a flat list of deploy pitfalls.

function rootDir(): string { return resolve(process.cwd(), ROOT) }
function absFromRel(rel: string): string {
  const abs = resolve(rootDir(), rel)
  if (abs !== rootDir() && !abs.startsWith(rootDir() + "/") && !abs.startsWith(rootDir() + "\\")) {
    throw new Error("path escapes PATTERNS root")
  }
  return abs
}

async function readPatternFile(rel: string): Promise<Pattern | null> {
  try {
    const abs = absFromRel(rel)
    const text = await readFile(abs, "utf8")
    const st = await stat(abs).catch(() => null)
    return parse(rel, text, st ? String(Math.round(st.mtimeMs)) : "")
  } catch { return null }
}

async function listDirFiles(relDir: string): Promise<Pattern[]> {
  let names: string[]
  try { names = await readdir(absFromRel(relDir)) } catch { return [] }
  const out: Pattern[] = []
  for (const name of names) {
    if (!name.endsWith(".md")) continue
    const p = await readPatternFile(`${relDir}/${name}`)
    if (p) out.push(p)
  }
  return out.sort((a, b) => a.number - b.number)
}

export async function listCategories(): Promise<string[]> {
  const seed = CATEGORIES.map(c => c.slug)
  let onDisk: string[] = []
  try {
    const entries = await readdir(absFromRel(PAT_DIR), { withFileTypes: true })
    onDisk = entries.filter(e => e.isDirectory()).map(e => e.name)
  } catch { /* PATTERNS/ not created yet */ }
  return Array.from(new Set([...seed, ...onDisk]))
}

export type PatternTree = {
  categories: { slug: string; label: string; patterns: Pattern[] }[]
  anti: Pattern[]
}

export async function listTree(): Promise<PatternTree> {
  const cats = await listCategories()
  const categories = await Promise.all(cats.map(async slug => ({
    slug, label: labelFor(slug), patterns: await listDirFiles(`${PAT_DIR}/${slug}`),
  })))
  const anti = await listDirFiles(ANTI_DIR)
  return { categories, anti }
}

export async function readPattern(id: string): Promise<Pattern | null> {
  return readPatternFile(decodeId(id))
}

async function nextNumber(): Promise<number> {
  const { categories, anti } = await listTree()
  const all = [...anti, ...categories.flatMap(c => c.patterns)]
  return Math.max(0, ...all.map(p => p.number)) + 1
}

// ---- mutations (read-modify-write the whole file) ----------------------------
export async function createPattern(kind: PatternKind, name: string, category: string): Promise<Pattern> {
  const number = await nextNumber()
  const slug = slugify(name) || (kind === "anti" ? "anti" : "pattern")
  const cat = kind === "pattern" ? (slugify(category) || CATEGORIES[0].slug) : ""
  const rel = kind === "anti"
    ? `${ANTI_DIR}/${pad(number)}-${slug}.md`
    : `${PAT_DIR}/${cat}/${pad(number)}-${slug}.md`
  const p: Pattern = {
    id: encodeId(rel), rel, kind, category: cat, number, name: name.trim(),
    status: "declared", declared: true, pending: true,
    description: "", code: "", tasks: [], mtime: "",
  }
  await mkdir(absFromRel(kind === "anti" ? ANTI_DIR : `${PAT_DIR}/${cat}`), { recursive: true })
  await writeFile(absFromRel(rel), render(p), "utf8")
  return p
}

export async function updatePattern(
  id: string,
  patch: Partial<Pick<Pattern, "name" | "description" | "code" | "status" | "tasks">>,
): Promise<Pattern | null> {
  const cur = await readPattern(id)
  if (!cur) return null
  const next: Pattern = { ...cur, ...patch }
  next.declared = next.status === "declared"
  next.pending = next.declared || next.tasks.length > 0
  await writeFile(absFromRel(cur.rel), render(next), "utf8")
  return next
}

export async function deletePattern(id: string): Promise<boolean> {
  const cur = await readPattern(id)
  if (!cur) return false
  try { await rm(absFromRel(cur.rel)) } catch { /* already gone */ }
  return true
}

export async function readRaw(id: string): Promise<string | null> {
  try { return await readFile(absFromRel(decodeId(id)), "utf8") } catch { return null }
}
