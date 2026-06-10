import { readdir, readFile, stat } from "fs/promises"
import { join, resolve } from "path"
import type { ArchNode } from "./types"
import { ROUTES_TREE } from "./routes"
import type { Requested, QueryParam } from "./requested-tree"

// Filesystem scan = the single source of truth for the architecture tree (step
// 108). The agent works directly on disk (writes real code, updates README.md);
// scanning the filesystem is what makes that work visible to the observer — a DB
// index would miss it. Returns the same shape the poll already consumes, plus
// builtExtra (real routes found on disk that are not in the curated seed).

export type ScanResult = {
  requested: Requested[]                              // declared: README, no built file
  projects: { id: string; name: string; slug: string; description: string | null; built: boolean }[]
  builtExtra: { href: string; kind: "page" | "api" }[]  // built routes outside the seed
  tasksByPath: Record<string, { count: number; last: string }>  // signature for blink
}

// All hrefs already represented in the curated seed tree (pages + API + projects)
// — built routes NOT here are the genuinely-new ones (e.g. a freshly-built
// declared page) that we surface as builtExtra.
function collectHrefs(node: ArchNode, acc: Set<string>): Set<string> {
  if (node.href) acc.add(node.href)
  node.children?.forEach(c => collectHrefs(c, acc))
  return acc
}
const SEED_HREFS = collectHrefs(ROUTES_TREE, new Set<string>())
const SKIP_DIRS = new Set(["_components", "node_modules", "(auth)"])

function appRoot(): string { return resolve(process.cwd(), "app") }

// "app/app/<segs>" dir → route path. The scan root is cwd/app (which is the
// Next app dir holding the route folders).
function toPath(relDir: string): string {
  const clean = relDir.replace(/\\/g, "/")
  return clean === "" ? "/" : "/" + clean
}

// Parse the human README.md we write (declared-readme.ts) back into fields.
function parseReadme(text: string) {
  const title = (text.match(/^#\s+(.+)$/m)?.[1] ?? "").trim()
  const kindRaw = (text.match(/\*\*Kind:\*\*\s*(\w+)/)?.[1] ?? "page").toLowerCase()
  const kind: "page" | "api" = kindRaw === "endpoint" ? "api" : "page"
  // Count top-level to-do bullets (a signature for the blink).
  const todoSec = text.split(/^##\s+To-do.*$/m)[1]?.split(/^##\s/m)[0] ?? ""
  const todoCount = (todoSec.match(/^- /gm) ?? []).length
  // Query params: lines like "- `key` = value" under "## Query params".
  const qSec = text.split(/^##\s+Query params.*$/m)[1]?.split(/^##\s/m)[0] ?? ""
  const query: QueryParam[] = []
  for (const m of qSec.matchAll(/^- `([^`]+)`\s*=\s*(.*)$/gm)) {
    query.push({ key: m[1], value: (m[2] ?? "").trim() })
  }
  return { title, kind, todoCount, query }
}

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true } catch { return false }
}

export async function scanTree(): Promise<ScanResult> {
  const root = appRoot()
  const res: ScanResult = { requested: [], projects: [], builtExtra: [], tasksByPath: {} }

  async function walk(dir: string, rel: string): Promise<void> {
    let entries: string[]
    try { entries = await readdir(dir) } catch { return }
    const hasPage = entries.includes("page.tsx")
    const hasRoute = entries.includes("route.ts")
    const hasReadme = entries.includes("README.md")
    const path = toPath(rel)

    if (hasReadme) {
      const file = join(dir, "README.md")
      let text = ""
      try { text = await readFile(file, "utf8") } catch {}
      const st = await stat(file).catch(() => null)
      const parsed = parseReadme(text)
      res.tasksByPath[path] = { count: parsed.todoCount, last: st ? String(st.mtimeMs) : "" }

      const built = hasPage || hasRoute
      if (!built) {
        // Declared (not built yet) → a "requested" node.
        const segs = rel.split("/")
        const last = segs[segs.length - 1]
        const dynamic = last.startsWith("[") && last.endsWith("]")
        const slug = dynamic ? last.slice(1, -1) : last
        const base = "/" + segs.slice(0, -1).join("/")
        res.requested.push({
          id: `fs:${path}`,
          slug, base: base === "/" ? "/" : base,
          kind: parsed.kind, dynamic, query: parsed.query,
          title: parsed.title || last, todo: [], status: "requested", created_at: "",
        })
      }
    }

    // Built route not in the curated seed → surface it so a freshly-built
    // declared route stays in the tree (requested → live transition).
    if ((hasPage || hasRoute) && !SEED_HREFS.has(path) && path !== "/project") {
      if (!path.startsWith("/project/")) {
        res.builtExtra.push({ href: path, kind: hasRoute ? "api" : "page" })
      }
    }

    // Projects = direct children of app/app/project/.
    if (rel.startsWith("project/")) {
      const sub = rel.slice("project/".length)
      if (!sub.includes("/")) {
        const file = join(dir, "README.md")
        let desc: string | null = null
        if (hasReadme) {
          try {
            const t = await readFile(file, "utf8")
            desc = (t.match(/\*\*Description:\*\*\s*(.+)$/m)?.[1] ?? "").trim() || null
          } catch {}
        }
        res.projects.push({ id: `fs:${path}`, name: sub, slug: sub, description: desc, built: hasPage || hasRoute })
      }
    }

    for (const name of entries) {
      if (SKIP_DIRS.has(name) || name.startsWith(".")) continue
      const full = join(dir, name)
      const st = await stat(full).catch(() => null)
      if (st?.isDirectory()) await walk(full, rel ? `${rel}/${name}` : name)
    }
  }

  await walk(root, "")
  return res
}
