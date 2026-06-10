"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, X } from "lucide-react"
import type { ArchNode } from "@/lib/architecture/types"
import { routeMetaFor } from "@/lib/architecture/route-manifest"
import {
  buildMergedTree, requestedNodeId, type Requested,
} from "@/lib/architecture/requested-tree"
import { TreeNode } from "@/components/architecture/tree-view.client"
import { DetailPanel } from "@/components/architecture/detail-panel.client"
import { RouteDetailPanel } from "@/components/architecture/route-detail-panel.client"
import { RequestedDetailPanel } from "@/components/architecture/requested-detail-panel.client"
import { DeclarePanel } from "@/components/architecture/declare-panel.client"

// Left section = the route tree (Add page lives in its top-right corner).
// Right section = the selected route's real RouteMeta descriptor (Open page in
// its top-right corner), the minimal read-only view of a declared page, the
// declaration form, or the legacy panel for descriptor-less nodes.
export function ArchitectureApp() {
  const [requested, setRequested] = useState<Requested[]>([])
  const [taskPaths, setTaskPaths] = useState<string[]>([])
  const [selected, setSelected] = useState<ArchNode | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["routes", "pages", "api"]))
  const [declaring, setDeclaring] = useState(false)

  // Requested pages drive the tree's declared nodes; the task summary marks
  // existing pages that carry pending work so the tree can badge them.
  function refresh() {
    fetch("/api/architecture/requested")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setRequested(d.requested ?? []) })
      .catch(() => {})
    fetch("/api/architecture/tasks?summary=1")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setTaskPaths(d.paths ?? []) })
      .catch(() => {})
  }
  useEffect(() => { refresh() }, [])

  const tree = useMemo(
    () => buildMergedTree(requested, new Set(taskPaths)),
    [requested, taskPaths],
  )
  useEffect(() => { setSelected(prev => prev ?? tree) }, [tree])

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function onCreated(r: Requested) {
    setRequested(prev => [r, ...prev])
    setExpanded(prev => new Set([...prev, "pages"]))
    setSelected({ id: requestedNodeId(r.id), label: r.title, kind: "page", href: `/${r.slug}`, pending: true })
    setDeclaring(false)
  }

  const reqItem = selected?.id.startsWith("req-")
    ? requested.find(r => requestedNodeId(r.id) === selected.id) ?? null
    : null
  const meta = selected && !reqItem ? routeMetaFor(selected.href ?? selected.label) : null

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <a href="/" className="font-mono text-xs text-foreground/70 transition-colors hover:text-foreground">
          ← back
        </a>
        <h1 className="mt-1 text-xl font-bold text-foreground">Architecture</h1>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-foreground/80">
          An interactive map of your app&apos;s structure — every page and endpoint backed by
          its typed descriptor (<span className="font-mono font-medium text-foreground">_meta.ts</span>). Open a route to read
          its full model, or add a new page as a to-do an agent picks up and builds.
        </p>

        {/* Wide by design: horizontal scroll on narrow screens (like a table). */}
        <div className="mt-6 overflow-x-auto">
          <div className="flex h-[72vh] min-w-[720px] overflow-hidden rounded-xl border border-border">
            {/* LEFT — tree, with Add page in its top-right corner */}
            <div className="flex w-1/2 flex-col border-r border-border bg-muted/10">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                  Pages &amp; API
                </span>
                <button
                  onClick={() => setDeclaring(v => !v)}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-foreground/40 px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
                >
                  {declaring ? <X size={11} /> : <Plus size={11} />}
                  {declaring ? "Close" : "Add page"}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                <TreeNode
                  node={tree}
                  depth={0}
                  selectedId={selected?.id ?? null}
                  expanded={expanded}
                  onSelect={(n) => { setSelected(n); setDeclaring(false) }}
                  onToggle={toggle}
                  onAdd={() => setDeclaring(true)}
                />
              </div>
            </div>

            {/* RIGHT — declaration, real descriptor, requested view, or legacy */}
            <div className="w-1/2">
              {declaring
                ? <DeclarePanel onClose={() => setDeclaring(false)} onCreated={onCreated} />
                : reqItem
                  ? <RequestedDetailPanel item={reqItem} />
                  : meta
                    ? <RouteDetailPanel meta={meta} onChanged={refresh} />
                    : <DetailPanel node={selected} />}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
