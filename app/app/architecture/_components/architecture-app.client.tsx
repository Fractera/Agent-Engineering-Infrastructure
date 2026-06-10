"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, X } from "lucide-react"
import type { ArchNode } from "@/lib/architecture/types"
import { routeMetaFor } from "@/lib/architecture/route-manifest"
import { projectApi } from "@/lib/architecture/project-api"
import {
  buildMergedTree, enrichWithRouting, realPageHrefs, requestedNodeId, reqHref, type Requested,
} from "@/lib/architecture/requested-tree"
import type { Project } from "@/lib/architecture/projects"
import { TreeNode } from "@/components/architecture/tree-view.client"
import { DetailPanel } from "@/components/architecture/detail-panel.client"
import { RouteDetailPanel } from "@/components/architecture/route-detail-panel.client"
import { RequestedDetailPanel } from "@/components/architecture/requested-detail-panel.client"
import { ProjectsPanel } from "@/components/architecture/projects-panel.client"
import { DeclarePanel } from "@/components/architecture/declare-panel.client"
import { EndpointPanel } from "@/components/architecture/endpoint-panel.client"
import { ProjectPicker } from "@/components/architecture/project-picker.client"

// Left section = the route tree (Add page lives in its top-right corner).
// Right section = the selected route's real RouteMeta descriptor (Open page in
// its top-right corner), the minimal read-only view of a declared page, the
// declaration form, or the legacy panel for descriptor-less nodes.
export function ArchitectureApp() {
  const [requested, setRequested] = useState<Requested[]>([])
  const [taskPaths, setTaskPaths] = useState<string[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<ArchNode | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["routes", "projects", "pages", "api"]))
  const [declaring, setDeclaring] = useState(false)
  const [picking, setPicking] = useState(false)          // endpoint: choose project modal
  const [endpointBase, setEndpointBase] = useState<string | null>(null)

  // Requested pages drive the tree's declared nodes; the task summary marks
  // existing pages that carry pending work; projects fill the Projects folder.
  function refresh() {
    fetch(projectApi("/architecture/requested"))
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setRequested(d.requested ?? []) })
      .catch(() => {})
    fetch(projectApi("/architecture/tasks?summary=1"))
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setTaskPaths(d.paths ?? []) })
      .catch(() => {})
    fetch("/api/projects")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) setProjects(d.projects ?? []) })
      .catch(() => {})
  }
  useEffect(() => { refresh() }, [])

  const [routingMap, setRoutingMap] = useState<Record<string, string[]>>({})
  const baseTree = useMemo(
    () => buildMergedTree(requested, new Set(taskPaths), projects),
    [requested, taskPaths, projects],
  )

  // For each real page node, fetch its routing files so the node renders as a
  // folder that opens to page.tsx / layout.tsx / … only.
  useEffect(() => {
    const hrefs = realPageHrefs(baseTree)
    let cancelled = false
    Promise.all(hrefs.map(async (href) => {
      try {
        const r = await fetch(projectApi(`/routing?path=${encodeURIComponent(href)}`))
        const files = r.ok ? ((await r.json()).files ?? []) : []
        return [href, files] as const
      } catch { return [href, []] as const }
    })).then(pairs => {
      if (!cancelled) setRoutingMap(Object.fromEntries(pairs))
    })
    return () => { cancelled = true }
  }, [baseTree])

  const tree = useMemo(() => enrichWithRouting(baseTree, routingMap), [baseTree, routingMap])
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
    const group = r.kind === "api" ? "api" : "pages"
    setExpanded(prev => new Set([...prev, group, `req-${r.id}`]))
    setSelected({ id: requestedNodeId(r.id), label: r.title, kind: r.kind, href: reqHref(r), pending: true, declared: true })
    setDeclaring(false)
    setEndpointBase(null)
  }

  // The base path a new page is added under = the active page node's href; a
  // group / root / non-page selection falls back to the project root "/".
  const addBase = selected?.kind === "page" && selected.href ? selected.href : "/"

  // The Projects folder itself opens the ProjectsPanel; real project pages
  // (with a descriptor) open their RouteDetailPanel like any named route.
  const isProject = selected?.id === "projects"
  const reqItem = selected?.id.startsWith("req-")
    ? requested.find(r => requestedNodeId(r.id) === selected.id) ?? null
    : null
  const meta = selected && !reqItem && !isProject ? routeMetaFor(selected.href ?? selected.label) : null

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
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <button
                  onClick={() => { setEndpointBase(null); setPicking(false); setDeclaring(v => !v) }}
                  title={declaring ? undefined : `Add page to: ${addBase}`}
                  className="inline-flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-foreground/40 px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
                >
                  {declaring ? <X size={11} className="shrink-0" /> : <Plus size={11} className="shrink-0" />}
                  <span className="truncate">{declaring ? "Close" : `Add page to: ${addBase}`}</span>
                </button>
                <button
                  onClick={() => { setDeclaring(false); setEndpointBase(null); setPicking(true) }}
                  className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-foreground/40 px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
                >
                  <Plus size={11} /> Add endpoint
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
                ? <DeclarePanel base={addBase} onClose={() => setDeclaring(false)} onCreated={onCreated} />
                : endpointBase !== null
                  ? <EndpointPanel base={endpointBase} onClose={() => setEndpointBase(null)} onCreated={onCreated} />
                  : isProject
                    ? <ProjectsPanel projects={projects} onChanged={refresh} />
                    : reqItem
                      ? <RequestedDetailPanel item={reqItem} />
                      : meta
                        ? <RouteDetailPanel meta={meta} onChanged={refresh} />
                        : <DetailPanel node={selected} />}
            </div>
          </div>
        </div>
      </div>

      {picking && (
        <ProjectPicker
          projects={projects}
          onClose={() => setPicking(false)}
          onPick={(b) => { setPicking(false); setSelected(null); setEndpointBase(b) }}
        />
      )}
    </main>
  )
}
