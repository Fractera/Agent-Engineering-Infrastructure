"use client"

import { useState } from "react"
import type { ArchNode } from "@/lib/architecture/types"
import { ROUTES_TREE } from "@/lib/architecture/routes"
import { TreeNode } from "@/components/architecture/tree-view.client"
import { DetailPanel } from "@/components/architecture/detail-panel.client"

// Public route map. Same interface as /architecture — a file-explorer tree on
// the left, the accompanying file on the right (roles, static/dynamic, method).
// Because you work in production and can't see the file tree, this is where you
// open and inspect your own project's pages and endpoints.
export default function RoutesPage() {
  const [selected, setSelected] = useState<ArchNode | null>(ROUTES_TREE)
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set([ROUTES_TREE.id, "pages", "api"]),
  )

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <a href="/" className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
          ← back
        </a>
        <h1 className="mt-1 text-xl font-semibold text-foreground">Routes</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The map of your project — open a route to see its roles, rendering and method
        </p>

        {/* Wide by design: horizontal scroll on narrow screens (like a table). */}
        <div className="mt-6 overflow-x-auto">
          <div className="flex min-w-[720px] overflow-hidden rounded-xl border border-border">
            <div className="w-1/2 border-r border-border bg-muted/10 py-2">
              <TreeNode
                node={ROUTES_TREE}
                depth={0}
                selectedId={selected?.id ?? null}
                expanded={expanded}
                onSelect={setSelected}
                onToggle={toggle}
                onAdd={() => {}}
              />
            </div>
            <div className="w-1/2">
              <DetailPanel node={selected} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
