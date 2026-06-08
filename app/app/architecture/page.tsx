"use client"

import { useState } from "react"
import { toast } from "sonner"
import type { ArchNode } from "@/lib/architecture/types"
import { ARCHITECTURE_TREE } from "@/lib/architecture/tree"
import { TreeNode } from "@/components/architecture/tree-view.client"
import { DetailPanel } from "@/components/architecture/detail-panel.client"

// Public page. A Windows-Explorer-style tree (left ~50%) plus an extended
// detail panel (right ~50%). One artefact, equally legible to the human (eyes)
// and the AI (few tokens). Wide by design: on narrow screens the split scrolls
// horizontally like a table rather than reflowing.
export default function ArchitecturePage() {
  const [selected, setSelected] = useState<ArchNode | null>(ARCHITECTURE_TREE)
  const [expanded, setExpanded] = useState<Set<string>>(new Set([ARCHITECTURE_TREE.id]))

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleAdd(parent: ArchNode) {
    toast.info(`Add to "${parent.label}" — coming in a later step`)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <a href="/" className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground">
          ← back
        </a>
        <h1 className="mt-1 text-xl font-semibold text-foreground">Architecture</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          A live map of your workspace — open a node to see how the pieces connect
        </p>

        {/* Wide by design: horizontal scroll on narrow screens (like a table). */}
        <div className="mt-6 overflow-x-auto">
          <div className="flex min-w-[720px] overflow-hidden rounded-xl border border-border">
            {/* Left ~50% — tree */}
            <div className="w-1/2 border-r border-border bg-muted/10 py-2">
              <TreeNode
                node={ARCHITECTURE_TREE}
                depth={0}
                selectedId={selected?.id ?? null}
                expanded={expanded}
                onSelect={setSelected}
                onToggle={toggle}
                onAdd={handleAdd}
              />
            </div>
            {/* Right ~50% — detail */}
            <div className="w-1/2">
              <DetailPanel node={selected} />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
