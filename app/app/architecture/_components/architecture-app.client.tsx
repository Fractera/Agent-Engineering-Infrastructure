"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import { ProjectPicker, type PickerProject } from "@/components/architecture/project-picker.client"
import { PollBar } from "@/components/architecture/poll-bar.client"

type Sig = Record<string, { count: number; last: string }>
function nodeKeys(reqs: Requested[], projs: Project[]): Set<string> {
  return new Set<string>([
    ...reqs.map(r => requestedNodeId(r.id)),
    ...projs.map(p => `project-${p.slug ?? p.id}`),
  ])
}

// Left section = the route tree (Add page lives in its top-right corner).
// Right section = the selected route's real RouteMeta descriptor (Open page in
// its top-right corner), the minimal read-only view of a declared page, the
// declaration form, or the legacy panel for descriptor-less nodes.
export function ArchitectureApp() {
  const [requested, setRequested] = useState<Requested[]>([])
  const [taskPaths, setTaskPaths] = useState<string[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [builtExtra, setBuiltExtra] = useState<{ href: string; kind: "page" | "api" }[]>([])
  const [selected, setSelected] = useState<ArchNode | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["routes", "projects", "pages", "api"]))
  const [declaring, setDeclaring] = useState(false)
  const [picking, setPicking] = useState(false)          // endpoint: choose project modal
  const [endpointBase, setEndpointBase] = useState<string | null>(null)
  const [blink, setBlink] = useState<Set<string>>(new Set())
  const [hidden, setHidden] = useState(false)

  // Live polling (step 106): one signature snapshot per tick. Diff against the
  // previous snapshot to blink ONLY the changed nodes; first load just seeds the
  // baseline (no blink).
  const prevSig = useRef<Sig>({})
  const prevKeys = useRef<Set<string>>(new Set())
  const seeded = useRef(false)

  function refresh() {
    fetch(projectApi("/architecture/signature"))
      .then(r => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        const sig: Sig = d.tasksByPath ?? {}
        const reqs: Requested[] = d.requested ?? []
        const projs: Project[] = d.projects ?? []
        setRequested(reqs)
        setProjects(projs)
        setBuiltExtra(d.builtExtra ?? [])
        setTaskPaths(Object.keys(sig))

        const keys = nodeKeys(reqs, projs)
        if (seeded.current) {
          const changed = new Set<string>()
          for (const [path, s] of Object.entries(sig)) {
            const p = prevSig.current[path]
            if (!p || p.count !== s.count || p.last !== s.last) changed.add(path)
          }
          for (const k of keys) if (!prevKeys.current.has(k)) changed.add(k)
          if (changed.size) {
            setBlink(changed)
            setTimeout(() => setBlink(new Set()), 1200)
          }
        }
        prevSig.current = sig
        prevKeys.current = keys
        seeded.current = true
      })
      .catch(() => {})
  }
  useEffect(() => { refresh() }, [])

  // Pause polling when the tab is backgrounded.
  useEffect(() => {
    const h = () => setHidden(document.hidden)
    document.addEventListener("visibilitychange", h)
    return () => document.removeEventListener("visibilitychange", h)
  }, [])

  const [routingMap, setRoutingMap] = useState<Record<string, string[]>>({})
  const baseTree = useMemo(
    () => buildMergedTree(requested, new Set(taskPaths), projects, builtExtra),
    [requested, taskPaths, projects, builtExtra],
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

  // All projects shown in the endpoint picker = the Projects folder's children
  // in the tree (both seed/built and DB-declared). slug from href or node id.
  const pickerProjects: PickerProject[] = useMemo(() => {
    const group = tree.children?.find(c => c.id === "projects")
    return (group?.children ?? []).map(n => {
      const slug = n.href?.startsWith("/project/")
        ? n.href.slice("/project/".length)
        : n.id.replace(/^project-/, "")
      const db = projects.find(p => (p.slug ?? "") === slug)
      return { label: n.label, slug, description: db?.description ?? null }
    })
  }, [tree, projects])

  // The Projects folder itself opens the ProjectsPanel.
  const isProject = selected?.id === "projects"
  const reqItem = selected?.id.startsWith("req-")
    ? requested.find(r => requestedNodeId(r.id) === selected.id) ?? null
    : null
  // Any declared node with a path (a requested page/endpoint OR a declared
  // project node) shows the requested panel (todo + danger + source).
  const declaredView = selected?.declared && selected.href && !isProject
    ? {
        title: selected.label,
        path: selected.href,
        kind: (selected.kind === "api" ? "api" : "page") as "page" | "api",
        dynamic: reqItem?.dynamic ?? false,
        query: reqItem?.query ?? [],
      }
    : null
  const meta = selected && !declaredView && !isProject ? routeMetaFor(selected.href ?? selected.label) : null

  // "Remove declaration": delete the declared row by id. For a requested
  // route/endpoint use its requested_routes id; for a declared project node use
  // the projects db id (resolved by slug). Then refresh + clear selection.
  async function removeDeclared() {
    if (!selected) return
    let url: string | null = null
    if (reqItem) url = projectApi(`/architecture/requested/${reqItem.id}`)
    else if (selected.id.startsWith("project-")) {
      const slug = selected.href?.startsWith("/project/")
        ? selected.href.slice("/project/".length)
        : selected.id.replace(/^project-/, "")
      const proj = projects.find(p => (p.slug ?? "") === slug)
      if (proj) url = `/api/projects/${proj.id}`
    }
    if (!url) return
    const res = await fetch(url, { method: "DELETE" })
    if (res.ok) { setSelected(null); refresh() }
  }

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

        {/* Live heartbeat: fills over 4s, then polls; new entities appear in real time. */}
        <div className="mt-4">
          <PollBar onPoll={refresh} paused={hidden} />
        </div>

        {/* Wide by design: horizontal scroll on narrow screens (like a table). */}
        <div className="mt-3 overflow-x-auto">
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
                  blink={blink}
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
                    ? <ProjectsPanel listed={pickerProjects} onChanged={refresh} />
                    : declaredView
                      ? <RequestedDetailPanel {...declaredView} onChanged={refresh} onRemove={removeDeclared} />
                      : meta
                        ? <RouteDetailPanel meta={meta} onChanged={refresh} />
                        : <DetailPanel node={selected} />}
            </div>
          </div>
        </div>
      </div>

      {picking && (
        <ProjectPicker
          projects={pickerProjects}
          onClose={() => setPicking(false)}
          onPick={(b) => { setPicking(false); setSelected(null); setEndpointBase(b) }}
        />
      )}
    </main>
  )
}
