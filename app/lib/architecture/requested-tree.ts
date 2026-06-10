import type { ArchNode } from "./types"
import { ROUTES_TREE } from "./routes"
import { DEFAULT_PROJECT, type Project } from "./projects"

// A declared-but-not-built page, persisted in app.db (requested_routes) and
// merged into the route tree as a "pending" node under Pages. Survives reload
// because it is fetched from the DB — that is what makes a declared page show up
// in the real architecture map, not just an in-memory list.
export type QueryParam = { key: string; value: string }

export type Requested = {
  id: string
  slug: string
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

// Turn each real page node into a folder of its routing files. routingMap maps a
// route href to the routing filenames that exist on disk (page.tsx, layout.tsx…).
// Components and _meta are intentionally absent — only routing files show.
export function enrichWithRouting(
  node: ArchNode,
  routingMap: Record<string, string[]>,
): ArchNode {
  const files = node.kind === "page" && node.href && !node.declared
    ? routingMap[node.href]
    : undefined
  const routingChildren: ArchNode[] = (files ?? []).map(name => ({
    id: `${node.id}-rf-${name}`,
    label: name,
    kind: "config",
    description: `Routing file ${name} for ${node.href}.`,
  }))
  // A page node can hold BOTH its routing files (page/layout/…) and nested
  // sub-pages declared under it — show routing files first, then the children.
  const existing = node.children?.map(c => enrichWithRouting(c, routingMap)) ?? []
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
  projects: Project[] = [],
): ArchNode {
  // Group declared pages by their base (where they were added). Root-level ones
  // (base "/") go into the Pages group; deeper ones attach under the node whose
  // href === base, enabling a tree of any depth.
  const byBase = new Map<string, ArchNode[]>()
  for (const r of requested) {
    const node: ArchNode = {
      id: requestedNodeId(r.id),
      label: r.title,
      kind: "page",
      href: reqHref(r),
      pending: true,
      declared: true,
    }
    const b = r.base && r.base !== "/" ? r.base : "/"
    byBase.set(b, [...(byBase.get(b) ?? []), node])
  }
  const rootReq = byBase.get("/") ?? []
  // The default project IS the root tree itself; the Projects folder lists only
  // the additional named projects.
  const projectNodes: ArchNode[] = projects
    .filter(p => (p.slug ?? p.name) !== DEFAULT_PROJECT && p.name !== DEFAULT_PROJECT)
    .map(p => ({ id: `project-${p.slug ?? p.id}`, label: p.name, kind: "note" as const }))
  const base: ArchNode = {
    ...ROUTES_TREE,
    children: ROUTES_TREE.children?.map(group => {
      if (group.id === "pages") return { ...group, children: [...(group.children ?? []), ...rootReq] }
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
