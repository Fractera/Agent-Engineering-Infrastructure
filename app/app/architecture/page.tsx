"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import type { ArchNode } from "@/lib/architecture/types"
import { ROUTES_TREE } from "@/lib/architecture/routes"
import { TreeNode } from "@/components/architecture/tree-view.client"
import { DetailPanel } from "@/components/architecture/detail-panel.client"
import { DeclarePanel } from "@/components/architecture/declare-panel.client"

// Public route map. A file-explorer tree on the left, the accompanying file on
// the right (roles, static/dynamic, method). "Add page" opens a right-side panel
// to declare a new page as a to-do list — a flag an agent picks up to plan and
// build it (ARCHITECTURE §3.11).
export default function RoutesPage() {
  const [selected, setSelected] = useState<ArchNode | null>(ROUTES_TREE)
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set([ROUTES_TREE.id, "pages", "api"]),
  )
  const [declaring, setDeclaring] = useState(false)

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

        <div className="mt-1 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Architecture</h1>
            <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-muted-foreground">
              An interactive map of your app&apos;s structure — its pages and endpoints, with
              each route&apos;s roles, rendering and method. Inspect the current state, change
              it, and add new pages with a task — a to-do. New pages join the development cycle
              automatically: from chat or Telegram, ask the agent to pick it up and build it.
            </p>
          </div>
          <button
            onClick={() => setDeclaring(v => !v)}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-foreground transition-colors hover:bg-muted"
          >
            {declaring ? <X size={12} /> : <Plus size={12} />}
            {declaring ? "Close" : "Add page"}
          </button>
        </div>

        {/* Wide by design: horizontal scroll on narrow screens (like a table). */}
        <div className="mt-6 overflow-x-auto">
          <div className="flex min-w-[720px] overflow-hidden rounded-xl border border-border">
            <div className="w-1/2 border-r border-border bg-muted/10 py-2">
              <TreeNode
                node={ROUTES_TREE}
                depth={0}
                selectedId={selected?.id ?? null}
                expanded={expanded}
                onSelect={(n) => { setSelected(n); setDeclaring(false) }}
                onToggle={toggle}
                onAdd={() => setDeclaring(true)}
              />
            </div>
            <div className="w-1/2">
              {declaring
                ? <DeclarePanel onClose={() => setDeclaring(false)} />
                : <DetailPanel node={selected} />}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
