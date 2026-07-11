import { slotRoot } from "@/lib/slot-root"
import { projectsRoot } from "@/lib/projects-root"
import { readdir, stat } from "fs/promises"
import { join, resolve } from "path"
import type { ArchNode } from "./types"
import { ROUTES_TREE } from "./routes"
import { readRouteMeta, encodePath } from "./readme-file"
import type { Requested } from "./requested-tree"

// Filesystem scan = the single source of truth for the architecture tree. A
// folder with a README.md but no built route file (page/route) is a DECLARED
// entity; with a built file it is LIVE. The README.md is parsed by readRouteMeta
// (no DB). Returns the exact shape the /architecture poll already consumes, so
// the UI does not change — only the storage behind it (mirrors how the glossary
// page reads GLOSSARY.md instead of a table).
//
// TWO ROOTS (step 210): the /projects/** URLs are served by the separate
// projects-app runtime since step 197 — the scan walks BOTH the slot and
// projectsRoot()/app, each root contributing only the URLs it owns.

export type Project = { id: string; name: string; slug: string; description: string | null; built: boolean }
export type ScanResult = {
  requested: Requested[]
  projects: Project[]
  builtExtra: { href: string; kind: "page" | "api" }[]
  tasksByPath: Record<string, { count: number; last: string }>
}

function appRoot(): string { return resolve(slotRoot(), "app") }

function collectHrefs(node: ArchNode, acc: Set<string>): Set<string> {
  if (node.href) acc.add(node.href)
  node.children?.forEach(c => collectHrefs(c, acc))
  return acc
}
const SEED_HREFS = collectHrefs(ROUTES_TREE, new Set<string>())
const SKIP = new Set(["_components", "_lib", "_data", "node_modules", ".next", "(auth)"])
const PAGE_FILES = ["page.tsx", "page.ts", "page.jsx", "page.js"]
const ROUTE_FILES = ["route.ts", "route.js"]
const LANG_SEG = "[lang]"

// Folder path -> URL path, the Next.js way (must match parser-routes.mjs):
//   strip route groups (group); strip the leading i18n [lang] locale prefix; keep
//   other dynamic segments [id]. So app/(service)/dashboard -> /dashboard and
//   app/[lang]/news -> /news (NOT /[lang]/news, which would orphan the node).
function toPath(rel: string): string {
  if (rel === "") return "/"
  const segs = rel.split("/").filter(Boolean)
  const out: string[] = []
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]
    if (s.startsWith("(") && s.endsWith(")")) continue
    if (i === 0 && s === LANG_SEG) continue
    out.push(s)
  }
  return out.length ? "/" + out.join("/") : "/"
}

const isProjectsPath = (p: string) => p === "/projects" || p.startsWith("/projects/")

export async function scanTree(): Promise<ScanResult> {
  const res: ScanResult = { requested: [], projects: [], builtExtra: [], tasksByPath: {} }

  async function walk(dir: string, rel: string, accept: (path: string) => boolean): Promise<void> {
    let entries: string[]
    try { entries = await readdir(dir) } catch { return }
    const set = new Set(entries)
    const hasPage = PAGE_FILES.some(f => set.has(f))
    const hasRoute = ROUTE_FILES.some(f => set.has(f))
    const built = hasPage || hasRoute
    const hasReadme = set.has("README.md")
    const path = toPath(rel)
    const accepted = accept(path)

    if (hasReadme && accepted) {
      const meta = await readRouteMeta(path)
      const st = await stat(join(dir, "README.md")).catch(() => null)
      res.tasksByPath[path] = { count: meta?.tasks.length ?? 0, last: st ? String(Math.round(st.mtimeMs)) : "" }
      if (meta && !built) {
        res.requested.push({
          id: encodePath(path),
          slug: path.split("/").pop() || path,
          kind: meta.kind,
          base: meta.base,
          dynamic: meta.dynamic,
          query: meta.query,
          title: meta.title,
          todo: meta.tasks.filter(t => t.kind === "todo").map(t => t.body),
          status: "requested",
          created_at: st ? new Date(st.mtimeMs).toISOString() : "",
          menus: meta.menus,
          visibility: meta.visibility,
          roles: meta.roles,
          admin: meta.admin,
          dashboard: meta.dashboard,
          cron: meta.cron,
          integrations: meta.integrations,
        })
      }
    }

    // Freshly built PAGE outside the curated seed → keep it in the tree
    // (declared → live transition). API routes are curated in the seed group, so
    // we do not surface built endpoints as extra to avoid flooding.
    if (accepted && hasPage && !SEED_HREFS.has(path) && !path.startsWith("/project/") && path !== "/project") {
      res.builtExtra.push({ href: path, kind: "page" })
    }

    for (const name of entries) {
      if (SKIP.has(name) || name.startsWith(".")) continue
      const full = join(dir, name)
      const st = await stat(full).catch(() => null)
      if (st?.isDirectory()) await walk(full, rel ? `${rel}/${name}` : name, accept)
    }
  }

  // Slot owns every URL except /projects/**; those live in projects-app since
  // step 197 (app/(projects)/projects/<category>/<slug> — the route group is
  // transparent to the URL, so toPath yields the real /projects/... hrefs).
  await walk(appRoot(), "", path => !isProjectsPath(path))
  await walk(resolve(projectsRoot(), "app"), "", isProjectsPath)
  return res
}
