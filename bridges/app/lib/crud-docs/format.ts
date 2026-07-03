// Types + path/name rules for the Documents knowledge base. Unlike the other
// filesystem pages (glossary, architecture, ai-draft) this one writes REAL folders and
// files directly — there is no machine block, no "declared" state. A folder you create
// or a document you upload is a real entry on disk under CRUD-DOCS/ immediately.

export type DocKind = "folder" | "file"

export type DocNode = {
  rel: string        // path relative to CRUD-DOCS/, POSIX separators ("dept/handbook.md")
  name: string       // leaf name
  kind: DocKind
  ext?: string       // lower-case extension for files (".md")
  size?: number      // bytes, for files
  mtime?: string
  children?: DocNode[]  // folders only
}

export const ROOT = "CRUD-DOCS"

// Documents allowed: plain text, Markdown, and Word documents.
export const ALLOWED_EXT = [".txt", ".md", ".markdown", ".doc", ".docx"] as const
// Which extensions we can render as readable text in Preview (the rest need a parser
// or download): .docx is extracted with mammoth at read time; .doc (legacy binary) is
// not extractable, so Preview offers download only.
export const TEXT_EXT = [".txt", ".md", ".markdown"] as const

export function extOf(name: string): string {
  const i = name.lastIndexOf(".")
  return i >= 0 ? name.slice(i).toLowerCase() : ""
}
export function isAllowedFile(name: string): boolean {
  return (ALLOWED_EXT as readonly string[]).includes(extOf(name))
}
export function isTextExt(ext: string): boolean {
  return (TEXT_EXT as readonly string[]).includes(ext.toLowerCase())
}

// Validate a single path segment (folder or file name) for the filesystem. Because we
// write to disk for real, the name must be safe: no path separators, no traversal, no
// reserved punctuation or control characters, no trailing dot/space, within a sane
// length. Spaces, dashes, underscores, dots and unicode letters ARE allowed.
const RESERVED = new RegExp("[<>:\"/\\\\|?*\\u0000-\\u001f]")
export function validateName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim()
  if (!name) return { ok: false, error: "Name is required" }
  if (name.length > 100) return { ok: false, error: "Name is too long (max 100)" }
  if (name === "." || name === "..") return { ok: false, error: "Reserved name" }
  if (RESERVED.test(name)) return { ok: false, error: "Contains invalid characters: < > : \" / \\ | ? *" }
  if (/[. ]$/.test(name)) return { ok: false, error: "Cannot end with a space or a dot" }
  return { ok: true, name }
}
