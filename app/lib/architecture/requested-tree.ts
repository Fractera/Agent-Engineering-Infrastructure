import type { ArchNode } from "./types"
import { ROUTES_TREE } from "./routes"

// A declared-but-not-built page, persisted in app.db (requested_routes) and
// merged into the route tree as a "pending" node under Pages. Survives reload
// because it is fetched from the DB — that is what makes a declared page show up
// in the real architecture map, not just an in-memory list.
export type Requested = {
  id: string
  slug: string
  title: string
  todo: string[]
  status: string
  created_at: string
  created_by?: string
}

export function requestedNodeId(id: string) {
  return `req-${id}`
}

// Clone the curated ROUTES_TREE, append the declared pages into the Pages group,
// and mark every node "pending" (orange + req badge) when it has pending work:
// a declared-but-not-built page, OR an existing route whose path carries open
// tasks (taskPaths). A live route with no tasks stays plain (black, no badge).
export function buildMergedTree(
  requested: Requested[],
  taskPaths: Set<string> = new Set(),
): ArchNode {
  const reqNodes: ArchNode[] = requested.map(r => ({
    id: requestedNodeId(r.id),
    label: r.title,
    kind: "page",
    href: `/${r.slug}`,
    pending: true,
    declared: true,
  }))
  const base: ArchNode = {
    ...ROUTES_TREE,
    children: ROUTES_TREE.children?.map(group =>
      group.id === "pages"
        ? { ...group, children: [...(group.children ?? []), ...reqNodes] }
        : group,
    ),
  }
  // Key matches the detail-panel manifest lookup: href ?? label.
  function mark(node: ArchNode): ArchNode {
    const hasTask = taskPaths.has(node.href ?? node.label)
    return {
      ...node,
      pending: node.pending || hasTask,
      children: node.children?.map(mark),
    }
  }
  return mark(base)
}
