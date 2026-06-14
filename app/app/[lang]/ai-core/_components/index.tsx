import { AiCoreApp } from "./ai-core-app.client"
import { requireAdmin } from "@/lib/auth/require-admin"
import { ARCHITECTURE_TREE } from "@/lib/architecture/tree"
import { buildDocsNode } from "@/lib/architecture/docs-tree"
import type { ArchNode } from "@/lib/architecture/types"

// Route entry component for /ai-core. Server by default; admin-only service page.
// The static seed tree describes the L2 services; its "Documentation" branch is
// swapped for a live mirror of the real files on disk (read at render — the page
// is dynamic + no-store, so every open re-reads). Reuses the per-feature scanners.
export default async function AiCoreEntry() {
  await requireAdmin()
  const docs = await buildDocsNode()
  const tree: ArchNode = {
    ...ARCHITECTURE_TREE,
    children: (ARCHITECTURE_TREE.children ?? []).map(c => (c.id === "docs" ? docs : c)),
  }
  return <AiCoreApp tree={tree} />
}
