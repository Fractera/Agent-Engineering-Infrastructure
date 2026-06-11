import { readdir, stat, mkdir, rm, writeFile, readFile } from "fs/promises"
import { resolve, join, sep } from "path"
import {
  ROOT, type DocNode, extOf, isAllowedFile, isTextExt, validateName,
} from "./format"

// Real filesystem operations for the Documents knowledge base under CRUD-DOCS/ at the
// project root. Everything here writes to disk for real (create folder, upload, delete)
// — there is no staging. Every path is forced to stay inside CRUD-DOCS/ (no traversal).

function rootDir(): string { return resolve(process.cwd(), ROOT) }

// Resolve a caller-supplied relative path safely inside CRUD-DOCS/. Throws on escape.
function absFromRel(rel: string): string {
  const clean = (rel || "").replace(/\\/g, "/").replace(/^\/+/, "")
  const abs = resolve(rootDir(), clean)
  const root = rootDir()
  if (abs !== root && !abs.startsWith(root + sep)) throw new Error("path escapes CRUD-DOCS root")
  return abs
}
function toRel(abs: string): string {
  const root = rootDir()
  return abs === root ? "" : abs.slice(root.length + 1).split(sep).join("/")
}

export async function ensureRoot(): Promise<void> {
  await mkdir(rootDir(), { recursive: true })
}

async function scanDir(absDir: string): Promise<DocNode[]> {
  let entries
  try { entries = await readdir(absDir, { withFileTypes: true }) } catch { return [] }
  const out: DocNode[] = []
  for (const e of entries) {
    if (e.name.startsWith(".")) continue
    const abs = join(absDir, e.name)
    const rel = toRel(abs)
    if (e.isDirectory()) {
      out.push({ rel, name: e.name, kind: "folder", children: await scanDir(abs) })
    } else if (e.isFile() && isAllowedFile(e.name)) {
      const st = await stat(abs).catch(() => null)
      out.push({
        rel, name: e.name, kind: "file", ext: extOf(e.name),
        size: st?.size, mtime: st ? String(Math.round(st.mtimeMs)) : undefined,
      })
    }
  }
  // Folders first, then files, each alphabetically.
  return out.sort((a, b) =>
    a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "folder" ? -1 : 1)
}

export async function scanTree(): Promise<DocNode[]> {
  await ensureRoot()
  return scanDir(rootDir())
}

// ---- mutations (real fs) ------------------------------------------------------
export async function createFolder(parentRel: string, name: string): Promise<{ ok: true; rel: string } | { ok: false; error: string }> {
  const v = validateName(name)
  if (!v.ok) return v
  const abs = absFromRel(join(parentRel || "", v.name))
  try { await stat(abs); return { ok: false, error: "An entry with this name already exists" } } catch { /* free */ }
  await mkdir(abs, { recursive: true })
  return { ok: true, rel: toRel(abs) }
}

export async function saveUpload(parentRel: string, filename: string, data: Buffer): Promise<{ ok: true; rel: string } | { ok: false; error: string }> {
  // Keep the original name but validate the stem; the extension must be allowed.
  if (!isAllowedFile(filename)) return { ok: false, error: "Only .txt, .md, .doc and .docx files are allowed" }
  const ext = extOf(filename)
  const stem = filename.slice(0, filename.length - ext.length)
  const v = validateName(stem)
  if (!v.ok) return { ok: false, error: `File name: ${v.error}` }
  const abs = absFromRel(join(parentRel || "", v.name + ext))
  await mkdir(resolve(abs, ".."), { recursive: true })
  await writeFile(abs, data)
  return { ok: true, rel: toRel(abs) }
}

export async function deleteEntry(rel: string): Promise<boolean> {
  if (!rel) return false
  const abs = absFromRel(rel)
  if (abs === rootDir()) return false
  try { await rm(abs, { recursive: true, force: true }); return true } catch { return false }
}

// ---- read / preview -----------------------------------------------------------
export type Preview = { kind: "text"; content: string } | { kind: "binary"; note: string } | { kind: "missing" }

export async function readPreview(rel: string): Promise<Preview> {
  let abs: string
  try { abs = absFromRel(rel) } catch { return { kind: "missing" } }
  const ext = extOf(rel)
  try {
    if (isTextExt(ext)) {
      return { kind: "text", content: await readFile(abs, "utf8") }
    }
    if (ext === ".docx") {
      // Extract readable text with mammoth (only available for the modern .docx zip).
      const mammoth = await import("mammoth")
      const { value } = await mammoth.extractRawText({ buffer: await readFile(abs) })
      return { kind: "text", content: value }
    }
    // .doc (legacy binary) — not extractable here; offer download instead.
    return { kind: "binary", note: "Legacy .doc cannot be previewed as text. Download it to view, or upload a .docx / .txt / .md version." }
  } catch {
    return { kind: "missing" }
  }
}

export async function readBuffer(rel: string): Promise<{ buf: Buffer; name: string } | null> {
  try {
    const abs = absFromRel(rel)
    return { buf: await readFile(abs), name: rel.split("/").pop() ?? "document" }
  } catch { return null }
}

// Plain text of a document for ingestion (.docx extracted, .doc unsupported).
export async function readTextForIngest(rel: string): Promise<string | null> {
  const p = await readPreview(rel)
  return p.kind === "text" ? p.content : null
}
