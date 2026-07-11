import { readdir, readFile, stat } from "node:fs/promises"
import { join, relative } from "node:path"
import { slotPath } from "@/lib/slot-root"
import { projectsPath } from "@/lib/projects-root"

// Runtime replacement for the slot's build-time routes.generated.ts.
//
// In the slot, parser-routes.mjs STATICALLY imported every app/**/_meta.ts into a
// generated manifest at build. This admin app cannot statically import files that
// live in a foreign, swappable slot, so it reads the descriptors at RUNTIME from
// the slot filesystem instead.
//
// The _meta.ts descriptors are DECLARATIVE by contract (a `import type { RouteMeta }`
// that erases at compile, a plain object literal, `export default meta`) — no runtime
// imports, no computed values. So we transform the TS text into an evaluatable object
// literal without a bundler: drop import lines, strip the `: RouteMeta` type annotation
// and any `as const`/`satisfies`, turn `export default meta` into `return meta`, and
// run it in an isolated Function. A descriptor that ever gains a real runtime import or
// computed value fails this transform and is skipped (graceful — the tree just omits it
// rather than crashing the admin app). The slot may also be empty/absent — every read
// degrades to an empty result.
//
// TWO ROOTS (step 211): since step 197 the /projects/** URLs are served by the separate
// projects-app runtime (:3003) — its projects carry the SAME _meta.ts descriptors (the
// frozen project-page template emits one), so the walk covers both roots: the slot owns
// every URL except /projects/**, projects-app owns /projects/** (physically under the
// "(projects)" route group, transparent to the URL).

export type SlotRouteMeta = Record<string, unknown> & { path?: string; kind?: string }
export type SlotRoute = { path: string; kind: "page" | "api"; group: string | null; meta: SlotRouteMeta }

const SKIP = new Set(["node_modules", ".next", "_components", "_lib", "_data"])
const PAGE_FILES = new Set(["page.tsx", "page.ts", "page.jsx", "page.js"])
const ROUTE_FILES = new Set(["route.ts", "route.js"])
const LANG_SEG = "[lang]"

const isGroup = (s: string) => s.startsWith("(") && s.endsWith(")")

function urlPath(folderRel: string): string {
  const segs = folderRel.split("/").filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]
    if (isGroup(s)) continue
    if (i === 0 && s === LANG_SEG) continue
    out.push(s)
  }
  const p = out.join("/")
  return p ? "/" + p : "/"
}

function routeGroupOf(folderRel: string): string | null {
  return folderRel.split("/").filter(isGroup).pop() ?? null
}

// Evaluate a declarative _meta.ts into a plain object. Returns null if the file is
// not a pure descriptor (has runtime imports / computed values) — caller skips it.
export function evalMetaSource(src: string): SlotRouteMeta | null {
  try {
    const lines = src.split("\n").filter((l) => !/^\s*import\s/.test(l))
    let body = lines.join("\n")
    // strip the type annotation on the descriptor const and any TS-only tails
    body = body.replace(/const\s+meta\s*:\s*RouteMeta\s*=/, "const meta =")
    body = body.replace(/\bas\s+const\b/g, "")
    body = body.replace(/\bsatisfies\s+RouteMeta\b/g, "")
    body = body.replace(/export\s+default\s+meta\s*;?/, "return meta;")
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(body)
    const value = fn()
    return value && typeof value === "object" ? (value as SlotRouteMeta) : null
  } catch {
    return null
  }
}

const isProjectsPath = (p: string) => p === "/projects" || p.startsWith("/projects/")

async function walk(
  appDir: string, dir: string, out: SlotRoute[], accept: (url: string) => boolean,
): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  const names = new Set(entries.map((e) => e.name))
  if (names.has("_meta.ts")) {
    const folderRel = relative(appDir, dir).split("\\").join("/")
    const kind: "page" | "api" | null = [...PAGE_FILES].some((f) => names.has(f))
      ? "page"
      : [...ROUTE_FILES].some((f) => names.has(f))
        ? "api"
        : null
    if (kind && accept(urlPath(folderRel))) {
      const meta = evalMetaSource(await readFile(join(dir, "_meta.ts"), "utf8").catch(() => ""))
      if (meta) {
        out.push({ path: urlPath(folderRel), kind, group: routeGroupOf(folderRel), meta })
      }
    }
  }
  for (const e of entries) {
    if (!e.isDirectory() || SKIP.has(e.name) || e.name.startsWith(".")) continue
    await walk(appDir, join(dir, e.name), out, accept)
  }
}

// Read the slot's route descriptors from disk. Cached by an mtime signature of the
// app/ tree so repeated reads are cheap; the slot rebuilds far less often than the
// admin serves requests.
let cache: { sig: string; routes: SlotRoute[] } | null = null

async function treeSignature(appDir: string): Promise<string> {
  // Cheap-ish signature: newest mtime + count of _meta.ts files. A rebuilt/edited
  // slot changes at least one, invalidating the cache.
  let newest = 0
  let count = 0
  async function scan(dir: string) {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      if (e.name === "_meta.ts") {
        count++
        const s = await stat(join(dir, e.name)).catch(() => null)
        if (s) newest = Math.max(newest, s.mtimeMs)
      }
      if (e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith(".")) {
        await scan(join(dir, e.name))
      }
    }
  }
  await scan(appDir)
  return `${count}:${Math.round(newest)}`
}

export async function readSlotRoutes(): Promise<SlotRoute[]> {
  const appDir = slotPath("app")
  const projectsDir = projectsPath("app")
  const sig = `${await treeSignature(appDir)}|${await treeSignature(projectsDir)}`
  if (cache && cache.sig === sig) return cache.routes
  const out: SlotRoute[] = []
  await walk(appDir, appDir, out, (url) => !isProjectsPath(url))
  await walk(projectsDir, projectsDir, out, isProjectsPath)
  out.sort((a, b) => (a.kind === b.kind ? a.path.localeCompare(b.path) : a.kind === "page" ? -1 : 1))
  cache = { sig, routes: out }
  return out
}

export async function readSlotRouteMeta(): Promise<Record<string, SlotRouteMeta>> {
  const routes = await readSlotRoutes()
  return Object.fromEntries(routes.map((r) => [r.path, r.meta]))
}
