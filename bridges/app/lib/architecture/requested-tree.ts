import type { ArchNode } from "./types"
import { ROUTES_TREE } from "./routes"
import { DEFAULT_PROJECT, type Project } from "./projects"

// A declared-but-not-built page, materialized as a real README.md on disk and
// merged into the route tree as a "pending" node under Pages. Survives reload
// because it is read back from the filesystem scan (fs-scan) — that is what makes
// a declared page show up in the real architecture map, not just an in-memory list.
export type QueryParam = { key: string; value: string }

export type Requested = {
  id: string
  slug: string
  kind: "page" | "api"
  base: string
  dynamic: boolean
  query: QueryParam[]
  title: string
  todo: string[]
  status: string
  created_at: string
  created_by?: string
}

export function requestedNodeId(id: string) {
  return `req-${id}`
}

// Full href of a declared page = base + segment. A page can be declared at any
// depth (base is where the user pressed "Add page"). A dynamic route renders the
// slug as a [param] segment, mirroring Next.js dynamic folders.
export function reqHref(r: { base?: string; slug: string; dynamic?: boolean }): string {
  const base = r.base && r.base !== "/" ? r.base : ""
  const seg = r.dynamic ? `[${r.slug}]` : r.slug
  return `${base}/${seg}`
}

// Real (built) page nodes whose routing files we can list — href set and not a
// declared/pending stub. Used to fetch routing files and to enrich the tree.
export function realPageHrefs(node: ArchNode, acc: string[] = []): string[] {
  if (node.kind === "page" && node.href && !node.declared) acc.push(node.href)
  node.children?.forEach(c => realPageHrefs(c, acc))
  return acc
}

// Re-id a server-provided file subtree so ids stay unique under this page node
// (the server uses path-based ids; prefix with the node id and keep recursion).
function adoptFileNodes(prefix: string, nodes: ArchNode[]): ArchNode[] {
  return nodes.map(n => ({
    ...n,
    id: `${prefix}/${n.id}`,
    children: n.children ? adoptFileNodes(prefix, n.children) : undefined,
  }))
}

// Turn each real page node into a folder of its REAL files. richMap maps a route
// href to the full file subtree (routing files + every _components/_lib/_data file,
// each leaf carrying its source) — a faithful copy of the folder, nothing omitted.
// routingMap (filenames only) is the legacy fallback when the rich tree is absent.
export function enrichWithRouting(
  node: ArchNode,
  routingMap: Record<string, string[]>,
  richMap: Record<string, ArchNode[]> = {},
): ArchNode {
  const isRealPage = node.kind === "page" && node.href && !node.declared
  const rich = isRealPage ? richMap[node.href!] : undefined
  const files = isRealPage ? routingMap[node.href!] : undefined
  let routingChildren: ArchNode[] = rich && rich.length
    ? adoptFileNodes(node.id, rich)
    : (files ?? []).map(name => ({
        id: `${node.id}-rf-${name}`,
        label: name,
        kind: "config",
        description: `Routing file ${name} for ${node.href}.`,
      }))
  // A declared (not-built) page/project is a FOLDER with a placeholder page.tsx —
  // it looks like a built page, but the file is created when the agent builds it.
  if (node.declared && node.kind === "page") {
    routingChildren = [{
      id: `${node.id}-rf-page`,
      label: "page.tsx",
      kind: "config",
      description: `page.tsx — created when the agent builds ${node.href ?? "this page"}.`,
    }]
  }
  // A page node can hold BOTH its routing files (page/layout/…) and nested
  // sub-pages declared under it — show routing files first, then the children.
  const existing = node.children?.map(c => enrichWithRouting(c, routingMap, richMap)) ?? []
  const merged = [...routingChildren, ...existing]
  return { ...node, children: merged.length ? merged : undefined }
}

// Clone the curated ROUTES_TREE, append the declared pages into the Pages group,
// and mark every node "pending" (orange + req badge) when it has pending work:
// a declared-but-not-built page, OR an existing route whose path carries open
// tasks (taskPaths). A live route with no tasks stays plain (black, no badge).
export function buildMergedTree(
  requested: Requested[],
  taskPaths: Set<string> = new Set(),
  projects: (Project & { built?: boolean })[] = [],
  builtExtra: { href: string; kind: "page" | "api" }[] = [],
): ArchNode {
  // Declared PAGES nest by their base (any depth). Declared ENDPOINTS (kind api)
  // are listed flat in the API group (there are no folders for endpoints).
  const byBase = new Map<string, ArchNode[]>()
  const apiNodes: ArchNode[] = []
  for (const r of requested) {
    const node: ArchNode = {
      id: requestedNodeId(r.id),
      // Show the REAL path (like the seed nodes do), not the free-text title —
      // the title is shown in the detail panel.
      label: reqHref(r),
      kind: r.kind === "api" ? "api" : "page",
      href: reqHref(r),
      pending: true,
      declared: true,
    }
    if (r.kind === "api") { apiNodes.push(node); continue }
    const b = r.base && r.base !== "/" ? r.base : "/"
    byBase.set(b, [...(byBase.get(b) ?? []), node])
  }
  // A declared page that the agent has BUILT (page.tsx now exists, README gone)
  // is no longer "requested" and not in the curated seed — keep it visible as a
  // live page node nested by its base, so the requested→live transition stays.
  for (const b of builtExtra) {
    if (b.kind !== "page") continue
    const segs = b.href.split("/")
    const base = segs.slice(0, -1).join("/") || "/"
    const node: ArchNode = { id: `built-${b.href}`, label: segs[segs.length - 1] || b.href, kind: "page", href: b.href }
    byBase.set(base, [...(byBase.get(base) ?? []), node])
  }
  const rootReq = byBase.get("/") ?? []
  // The default project IS the root tree itself; the Projects folder lists only
  // the additional named projects.
  // A project is a folder with a page (like the seed my-telegram-reminder). A
  // DB-declared project is not built yet → a pending page node (orange + req)
  // that the agent turns into a real /project/<slug> folder with a page.tsx.
  // Built projects (a real folder + page.tsx) already appear in the curated seed —
  // do not duplicate them, and never mark a built project as a removable draft.
  // Only a DECLARED project (README, no page yet) is pending/declared (req).
  const seedProjectHrefs = new Set<string>()
  ROUTES_TREE.children?.find(g => g.id === "projects")?.children?.forEach(c => c.href && seedProjectHrefs.add(c.href))
  const projectNodes: ArchNode[] = projects
    .filter(p => (p.slug ?? p.name) !== DEFAULT_PROJECT && p.name !== DEFAULT_PROJECT)
    .filter(p => !seedProjectHrefs.has(`/project/${p.slug ?? p.id}`))
    .map(p => ({
      id: `project-${p.slug ?? p.id}`,
      label: p.name,
      kind: "page" as const,
      href: `/project/${p.slug ?? p.id}`,
      pending: !p.built,
      declared: !p.built,
    }))
  const base: ArchNode = {
    ...ROUTES_TREE,
    children: ROUTES_TREE.children?.map(group => {
      if (group.id === "pages") return { ...group, children: [...(group.children ?? []), ...rootReq] }
      if (group.id === "api") return { ...group, children: [...(group.children ?? []), ...apiNodes] }
      if (group.id === "projects") return { ...group, children: [...(group.children ?? []), ...projectNodes] }
      return group
    }),
  }
  // One recursive pass: mark pending (own or task-carrying) and attach declared
  // pages whose base equals this node's href (nested declarations included).
  function build(node: ArchNode): ArchNode {
    const kids = node.children?.map(build) ?? []
    if (node.href && node.href !== "/" && byBase.has(node.href)) {
      kids.push(...byBase.get(node.href)!.map(build))
    }
    const hasTask = taskPaths.has(node.href ?? node.label)
    return { ...node, pending: node.pending || hasTask, children: kids.length ? kids : node.children }
  }
  return build(base)
}
