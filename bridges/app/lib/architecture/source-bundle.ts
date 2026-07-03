import { slotRoot } from "@/lib/slot-root"
import { readdir, readFile, stat } from "fs/promises"
import { join, resolve, relative, extname } from "path"
import type { ArchNode } from "./types"

// Server util: read a route's real source files for the read-only /architecture
// code viewer. Read-only by contract — callers must never write. Security: every
// resolved path is checked to stay inside the app/ root; anything escaping it is
// refused.
//
// KEY: a URL path does NOT map 1:1 to a folder. Next.js route groups "(service)"
// and the i18n "[lang]" segment are transparent to the URL — so "/blog" lives at
// app/[lang]/blog and "/dashboard" at app/(service)/dashboard. We therefore RESOLVE
// the real directory by scanning app/ and reversing the same rule the tree uses.

export type SourceFile = { rel: string; content: string; language: string }

const LANG: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript",
  ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript",
  ".json": "json", ".css": "css", ".md": "markdown", ".svg": "xml",
}

function appRoot(): string {
  // slotRoot() is /opt/fractera/app; routes live under app/<segments>.
  return resolve(slotRoot(), "app")
}

const LANG_SEG = "[lang]"
const isGroup = (s: string) => s.startsWith("(") && s.endsWith(")")

// Folder path (relative to app/) -> URL path. Must match parser-routes.mjs /
// fs-scan.toPath: strip (group); strip a leading [lang]; keep other [seg].
function toUrlPath(folderRel: string): string {
  if (folderRel === "") return "/"
  const segs = folderRel.split(/[\\/]/).filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]
    if (isGroup(s)) continue
    if (i === 0 && s === LANG_SEG) continue
    out.push(s)
  }
  return out.length ? "/" + out.join("/") : "/"
}

// Naive URL -> dir mapper (sync). Used for DECLARED routes (README.md / placeholder
// page live at the literal app/<path> the scaffold creates) — kept for the readme /
// requested / projects consumers. The rich code viewer uses resolveRouteDir (async,
// reverse-mapped through (group)/[lang]) instead.
export function routeDir(routePath: string): string {
  const clean = routePath.replace(/^\/+|\/+$/g, "")
  const dir = resolve(appRoot(), clean)
  if (dir !== appRoot() && !dir.startsWith(appRoot() + "/")) {
    throw new Error("path escapes app root")
  }
  return dir
}

const ROUTING_BASENAMES = [
  "page", "layout", "loading", "error", "not-found", "template", "default", "route",
]
const ROUTING_EXTS = [".tsx", ".ts", ".jsx", ".js"]
const isRoutingFile = (name: string) => {
  const dot = name.lastIndexOf(".")
  if (dot < 0) return false
  return ROUTING_BASENAMES.includes(name.slice(0, dot)) && ROUTING_EXTS.includes(name.slice(dot))
}

// ── reverse map: URL path -> real on-disk dir (cached briefly) ────────────────
let _map: { at: number; m: Map<string, string> } | null = null

async function buildMap(): Promise<Map<string, string>> {
  const root = appRoot()
  // url -> { dir, strong } — strong = the dir has a page/route file (a real route),
  // not just a layout. On a URL collision (e.g. app/ root layout vs app/[lang]/page
  // both -> "/") the strong one wins, so "/" resolves to the home PAGE dir.
  const m = new Map<string, { dir: string; strong: boolean }>()
  async function walk(dir: string, rel: string): Promise<void> {
    let names: string[]
    try { names = await readdir(dir) } catch { return }
    const set = new Set(names)
    const hasRouting = ROUTING_BASENAMES.some(b => ROUTING_EXTS.some(e => set.has(b + e)))
    if (hasRouting) {
      const strong = ["page", "route"].some(b => ROUTING_EXTS.some(e => set.has(b + e)))
      const url = toUrlPath(rel)
      const cur = m.get(url)
      if (!cur || (strong && !cur.strong)) m.set(url, { dir, strong })
    }
    for (const name of names) {
      if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue
      const full = join(dir, name)
      const st = await stat(full).catch(() => null)
      if (st?.isDirectory()) await walk(full, rel ? `${rel}/${name}` : name)
    }
  }
  await walk(root, "")
  return new Map([...m].map(([k, v]) => [k, v.dir]))
}

async function resolveRouteDir(routePath: string): Promise<string> {
  const now = Date.now()
  if (!_map || now - _map.at > 2000) _map = { at: now, m: await buildMap() }
  const real = _map.m.get(routePath)
  const root = appRoot()
  // Fallback to the naive mapping (covers API routes and anything not scanned).
  const dir = real ?? resolve(root, routePath.replace(/^\/+|\/+$/g, ""))
  if (dir !== root && !dir.startsWith(root + "/") && dir !== root) {
    throw new Error("path escapes app root")
  }
  return dir
}

// List the routing files that actually exist in a route's real directory.
export async function routingFiles(routePath: string): Promise<string[]> {
  const dir = await resolveRouteDir(routePath)
  let names: string[]
  try { names = await readdir(dir) } catch { return [] }
  const set = new Set(names)
  const out: string[] = []
  for (const base of ROUTING_BASENAMES) {
    for (const ext of ROUTING_EXTS) {
      if (set.has(base + ext)) out.push(base + ext)
    }
  }
  return out
}

async function readIfExists(file: string): Promise<string | null> {
  try { return await readFile(file, "utf8") } catch { return null }
}

// ── full file SUBTREE of a route (routing files + every _components/_lib/_data
//    file, recursively), each leaf carrying its real source for the code viewer.
//    Child ROUTE folders (plain names, [seg], (group)) are NOT included — they are
//    separate route nodes in the tree. Co-located folders are exactly the _-prefixed
//    ones. "An absolute copy of the tree, no omissions." ───────────────────────
export async function routeFileTree(routePath: string): Promise<ArchNode[]> {
  const dir = await resolveRouteDir(routePath)
  const root = appRoot()

  async function fileNode(abs: string): Promise<ArchNode | null> {
    const content = await readIfExists(abs)
    if (content == null) return null
    const rel = relative(root, abs).split("\\").join("/")
    return {
      id: `file:${rel}`,
      label: abs.split(/[\\/]/).pop() || rel,
      kind: "config",
      description: `app/${rel}`,
      content,
    }
  }

  async function dirNodes(d: string, routingFirst: boolean): Promise<ArchNode[]> {
    let entries: string[]
    try { entries = await readdir(d) } catch { return [] }
    const fileNodes: ArchNode[] = []
    const folderNodes: ArchNode[] = []
    for (const name of entries.sort()) {
      const full = join(d, name)
      const st = await stat(full).catch(() => null)
      if (!st) continue
      if (st.isDirectory()) {
        // Only co-located convention folders (_components/_lib/_data/_*) belong to
        // THIS route. Plain names / [seg] / (group) are child routes — skip them.
        if (!name.startsWith("_")) continue
        const children = await dirNodes(full, false)
        const rel = relative(root, full).split("\\").join("/")
        folderNodes.push({ id: `dir:${rel}`, label: name, kind: "group", description: `app/${rel}`, children })
      } else {
        const n = await fileNode(full)
        if (n) fileNodes.push(n)
      }
    }
    // At the route's own level, surface routing files first (page/layout/not-found…),
    // then the rest (e.g. _meta.ts), then the co-located folders.
    if (routingFirst) {
      const isR = (n: ArchNode) => isRoutingFile(n.label)
      fileNodes.sort((a, b) => (isR(a) === isR(b) ? a.label.localeCompare(b.label) : isR(a) ? -1 : 1))
    }
    return [...fileNodes, ...folderNodes]
  }

  return dirNodes(dir, true)
}

export async function collectSource(routePath: string): Promise<SourceFile[]> {
  const dir = await resolveRouteDir(routePath)
  const root = appRoot()
  const out: SourceFile[] = []

  async function add(abs: string) {
    const content = await readIfExists(abs)
    if (content == null) return
    out.push({ rel: relative(root, abs).split("\\").join("/"), content, language: LANG[extname(abs)] ?? "plaintext" })
  }

  for (const name of await routingFiles(routePath)) {
    await add(join(dir, name))
  }
  try {
    const compDir = join(dir, "_components")
    for (const name of (await readdir(compDir)).sort()) {
      await add(join(compDir, name))
    }
  } catch { /* no _components — fine */ }

  return out
}
