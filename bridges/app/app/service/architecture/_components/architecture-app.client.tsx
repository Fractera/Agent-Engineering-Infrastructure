"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, X } from "lucide-react"
import type { ArchNode } from "@/lib/architecture/types"
import type { RouteMeta } from "@/lib/architecture/route-meta"
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

// Walk the tree collecting the ancestor folder ids of every node whose id OR href
// is in `keys` (same match as TreeNode.isBlinking), plus the first matched node id
// to scroll to — drives auto-reveal of what a background agent just created/changed.
function revealTargets(
  node: ArchNode,
  keys: Set<string>,
  trail: string[] = [],
  acc: { ancestors: Set<string>; scrollId: string | null } = { ancestors: new Set(), scrollId: null },
): { ancestors: Set<string>; scrollId: string | null } {
  if (keys.has(node.id) || (!!node.href && keys.has(node.href))) {
    trail.forEach(id => acc.ancestors.add(id))
    if (!acc.scrollId) acc.scrollId = node.id
  }
  node.children?.forEach(c => revealTargets(c, keys, [...trail, node.id], acc))
  return acc
}

// Depth-first lookup of a node by id — used by the ?project= deep-link (step 186.6)
// to focus a specific project node arriving from a project footer / email link.
function findNodeById(node: ArchNode, id: string): ArchNode | null {
  if (node.id === id) return node
  for (const c of node.children ?? []) {
    const found = findNodeById(c, id)
    if (found) return found
  }
  return null
}

// Left section = the route tree (Add page lives in its top-right corner).
// Right section = the selected route's real RouteMeta descriptor (Open page in
// its top-right corner), the minimal read-only view of a declared page, the
// declaration form, or the legacy panel for descriptor-less nodes.
export function ArchitectureApp() {
  const [requested, setRequested] = useState<Requested[]>([])
  const [routeMeta, setRouteMeta] = useState<Record<string, RouteMeta>>({})
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
  const [pendingDelete, setPendingDelete] = useState<ArchNode | null>(null)  // flow-B Delete confirm
  const [launching, setLaunching] = useState(false)                          // flow-B Launch in flight

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
            setTimeout(() => setBlink(new Set()), 3000)
          }
        }
        prevSig.current = sig
        prevKeys.current = keys
        seeded.current = true
      })
      .catch(() => {})
  }
  useEffect(() => { refresh() }, [])

  // Route descriptors (_meta.ts) come from the slot filesystem at runtime — the admin
  // app can't statically bundle a swappable slot's meta (was routes.generated.ts in the
  // slot). Fetch the manifest once; routeMeta[path] then feeds the detail panel below.
  useEffect(() => {
    fetch("/api/architecture/manifest")
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.meta) setRouteMeta(d.meta as Record<string, RouteMeta>) })
      .catch(() => {})
  }, [])

  // Pause polling when the tab is backgrounded.
  useEffect(() => {
    const h = () => setHidden(document.hidden)
    document.addEventListener("visibilitychange", h)
    return () => document.removeEventListener("visibilitychange", h)
  }, [])

  const [routingMap, setRoutingMap] = useState<Record<string, string[]>>({})
  const [richMap, setRichMap] = useState<Record<string, ArchNode[]>>({})
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
        const json = r.ok ? await r.json() : {}
        return [href, json.files ?? [], (json.nodes ?? []) as ArchNode[]] as const
      } catch { return [href, [], [] as ArchNode[]] as const }
    })).then(triples => {
      if (cancelled) return
      setRoutingMap(Object.fromEntries(triples.map(([h, f]) => [h, f])))
      setRichMap(Object.fromEntries(triples.map(([h, , n]) => [h, n])))
    })
    return () => { cancelled = true }
  }, [baseTree])

  const tree = useMemo(() => enrichWithRouting(baseTree, routingMap, richMap), [baseTree, routingMap, richMap])
  useEffect(() => { setSelected(prev => prev ?? tree) }, [tree])

  // Auto-reveal: when the poll flags new/changed nodes (blink), open their parent
  // folders and scroll the first into view — the observer sees what a background
  // agent just did, even off-screen or in a collapsed folder. Selection untouched.
  useEffect(() => {
    if (!blink.size) return
    const { ancestors, scrollId } = revealTargets(tree, blink)
    if (ancestors.size) setExpanded(prev => new Set([...prev, ...ancestors]))
    if (!scrollId) return
    const t = setTimeout(() => {
      document.getElementById(`arch-node-${scrollId}`)?.scrollIntoView({ block: "center", behavior: "smooth" })
    }, 120)
    return () => clearTimeout(t)
  }, [blink, tree])

  // Deep-link focus (step 186.5): /service/architecture?project=<cat>/<slug> opens
  // with that project node selected, its ancestors expanded and scrolled into view.
  // The link arrives from a project footer ("continue development", 186.2) and from
  // the welcome / domain emails (186.7). Projects load asynchronously, so this runs
  // on each tree update until the target node exists, then once (deepLinkDone).
  const deepLinkDone = useRef(false)
  useEffect(() => {
    if (deepLinkDone.current) return
    const raw = new URLSearchParams(window.location.search).get("project")
    if (!raw) { deepLinkDone.current = true; return }
    const slug = raw.split("/").filter(Boolean).pop() ?? raw
    const targetId = `project-${slug}`
    const found = findNodeById(tree, targetId)
    if (!found) return // tree not yet carrying this project — retry on next update
    deepLinkDone.current = true
    setSelected(found)
    const { ancestors } = revealTargets(tree, new Set([targetId]))
    setExpanded(prev => new Set([...prev, "projects", ...ancestors]))
    setTimeout(() => {
      document.getElementById(`arch-node-${targetId}`)?.scrollIntoView({ block: "center", behavior: "smooth" })
    }, 150)
  }, [tree])

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
    setSelected({ id: requestedNodeId(r.id), label: reqHref(r), kind: r.kind, href: reqHref(r), pending: true, declared: true })
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
        title: reqItem?.title ?? selected.label,
        path: selected.href,
        kind: (selected.kind === "api" ? "api" : "page") as "page" | "api",
        dynamic: reqItem?.dynamic ?? false,
        query: reqItem?.query ?? [],
        menus: reqItem?.menus,
        visibility: reqItem?.visibility,
        roles: reqItem?.roles,
        admin: reqItem?.admin,
        dashboard: reqItem?.dashboard,
        cron: reqItem?.cron,
        integrations: reqItem?.integrations,
      }
    : null
  const meta = selected && !declaredView && !isProject ? (routeMeta[selected.href ?? selected.label] ?? null) : null

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

  // flow-B Launch (step 126): bundle EVERY pending record on /architecture into one
  // development step, then go to /development-steps to see it. The bundle + source-
  // record deletion happens server-side (POST /api/development-steps).
  async function launchBundle() {
    if (launching) return
    setLaunching(true)
    try {
      const res = await fetch("/api/development-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleArchitecture: true }),
      })
      if (res.ok) { window.location.href = "/development-steps"; return }
    } catch {}
    setLaunching(false)
  }

  // flow-B Delete (step 126): confirm, then remove just this pending record. A declared
  // route (req- node) drops its requested row; a live route with open tasks clears its
  // tasks. The real route file is never touched. Then refresh + clear selection if it was it.
  async function confirmDeletePending() {
    const node = pendingDelete
    if (!node) return
    let url: string | null = null
    const req = node.id.startsWith("req-")
      ? requested.find(r => requestedNodeId(r.id) === node.id) ?? null
      : null
    if (req) url = projectApi(`/architecture/requested/${req.id}`)
    else if (node.href) url = projectApi(`/architecture/tasks?path=${encodeURIComponent(node.href)}`)
    if (!url) { setPendingDelete(null); return }
    const res = await fetch(url, { method: "DELETE" })
    if (res.ok) {
      if (selected?.id === node.id) setSelected(null)
      refresh()
    }
    setPendingDelete(null)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="mt-1 text-xl font-bold text-foreground">Architecture</h1>
        <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-foreground/80">
          An interactive map of your app&apos;s real structure — every page and endpoint backed by
          its typed descriptor (<span className="font-mono font-medium text-foreground">_meta.ts</span>).
          But between you and those real files sits a staging layer of <span className="font-mono font-medium text-foreground">README</span> files:
          you — or an AI agent — declare a page or endpoint and write your intent there in free form
          (notes, code examples, a to-do list), without touching the real code. That README is a
          preliminary step — a coding agent reads it, opens a development step into the build queue
          and builds it, then the README is gone, replaced by the real, working route or endpoint.
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
                  onLaunch={launchBundle}
                  onDeletePending={(n) => setPendingDelete(n)}
                />
              </div>
            </div>

            {/* RIGHT — declaration, real descriptor, requested view, or legacy.
                overflow-y-auto: the panel can be taller than the column (e.g. the
                420px source terminal + meta + danger zone), so the COLUMN itself
                scrolls — reach the bottom elements regardless of viewport size. */}
            <div className="w-1/2 overflow-y-auto">
              {declaring
                ? <DeclarePanel base={addBase} onClose={() => setDeclaring(false)} onCreated={onCreated} />
                : endpointBase !== null
                  ? <EndpointPanel base={endpointBase} onClose={() => setEndpointBase(null)} onCreated={onCreated} />
                  : isProject
                    ? <ProjectsPanel listed={pickerProjects} onChanged={refresh} />
                    : declaredView
                      ? <RequestedDetailPanel {...declaredView} onChanged={refresh} onRemove={removeDeclared} />
                      : meta
                        ? <RouteDetailPanel meta={meta} name={selected?.name} onChanged={refresh} locked={selected?.badge === "service"} />
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

      {/* flow-B Delete confirm (step 126): removing the staging record only — the real
          route file, if any, is never touched. */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-sm font-bold text-foreground">Delete this record?</h2>
            <p className="mt-2 text-xs leading-relaxed text-foreground/80">
              This permanently removes the staging record
              <span className="font-mono font-medium text-foreground"> {pendingDelete.label}</span>
              {pendingDelete.declared
                ? " (a declared page/endpoint that was never built)."
                : " (the open to-do / deletion tasks on this route)."}
              {" "}The real route file, if one exists, is never touched.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="inline-flex h-7 items-center rounded-md border border-foreground/40 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted/60"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePending}
                className="inline-flex h-7 items-center rounded-md bg-red-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
