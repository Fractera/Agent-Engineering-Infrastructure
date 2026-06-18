import { AiCoreApp } from "./ai-core-app.client"
import { requireAdmin } from "@/lib/auth/require-admin"
import { ARCHITECTURE_TREE } from "@/lib/architecture/tree"
import { buildDocsNode } from "@/lib/architecture/docs-tree"
import { enrichSkills } from "@/lib/architecture/skills-tree"
import type { ArchNode } from "@/lib/architecture/types"

// Route entry component for /ai-core. Server by default; admin-only service page.
// The static seed tree describes the L2 services; two branches are then made live at
// render (the page is dynamic + no-store, so every open re-reads): the "Documentation"
// branch is swapped for a disk mirror, and every "Skills" group is filled from the real
// skill files on disk (enrichSkills). Reuses the per-feature scanners.
export default async function AiCoreEntry() {
  await requireAdmin()
  const docs = await buildDocsNode()
  const seeded: ArchNode = {
    ...ARCHITECTURE_TREE,
    children: (ARCHITECTURE_TREE.children ?? []).map(c => (c.id === "docs" ? docs : c)),
  }
  const tree = await enrichSkills(seeded)
  return <AiCoreApp tree={tree} />
}
