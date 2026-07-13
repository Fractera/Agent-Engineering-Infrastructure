"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FlaskConical, Hammer, LayoutGrid, Play, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { NodeContract } from "../node-contract";
import { DiagramPanel, NodeCard } from "./diagram-panel.client";
import { BuilderNodePanel } from "./builder-node-panel.client";
import { StartDevelopment } from "./start-development.client";

// FROZEN STANDARD (step 223.C + 224) — the diagram CANVAS. Two modes:
//
// VIEW (223.C): the Master's nodes as a graph; click a node → its full contract in the side panel. The
// ACTIVE-NODE HIGHLIGHT (223.C.3) polls the automation's active run and frames the running node ORANGE.
//
// BUILDER (224 L4): the canvas becomes an AUTHORING surface — the diagram stops merely reflecting the code
// and starts DRIVING it. Every node grows a "+" (add child) button; a new node is born a DRAFT with a RED
// frame (not built yet, ignored by execution — a project with any draft is "In development"). The side
// panel becomes the BuilderNodePanel (draft → free-form brief; materialized → system instruction + version
// history + rollback). Nodes are draggable and the layout is saved on leaving Builder (a BATCHED save — see
// `positions`/`saveLayout` below, not per-drag). The canvas renders the LIVE index (GET /api/projects/nodes)
// unioned with the build-time nodes prop by cuid, so a node created in Builder appears INSTANTLY — no
// rebuild (the files are written, the build follows at materialize time).
//
// STEP 236.1 (same fix as global-canvas.client.tsx, same root cause): this canvas was ALSO controlled
// (nodes={...}) with no onNodesChange — dragging a node in Builder never moved live, only jumped on release.
// Fixed the same way: `nodes` is now real useNodesState, and a merge effect (below `layout`) refreshes
// label/sub/draft/runStatus from the polled index WITHOUT touching a node's position once it exists — the
// index-signature dedupe guard on `refetchIndex` already prevented the poll from touching x/y mid-drag (it
// only updates when the SERVER's x/y itself changes, which only happens on the batched Builder-close save),
// but that alone was never enough for LIVE drag — onNodesChange is what React Flow actually needs for that,
// per its own docs (see the fuller writeup in global-canvas.client.tsx's header comment).
export type IndexNode = {
  cuid: string; slug: string; name: string; parent_cuid: string | null; ord: number;
  x: number | null; y: number | null; draft: number; active_version: number; latest_version: number;
  status: string;
};
type Sources = Record<string, { spec: string; instruction: string }>;

type RunStatus = "idle" | "running" | "ok" | "fail";
type CanvasNodeData = {
  label: string; sub: string; runStatus: RunStatus; draft: boolean; builder: boolean;
  onAddChild: (cuid: string) => void; cuid: string;
};
type CanvasNode = Node<CanvasNodeData, "diagram">;

const RUN_FRAME: Record<RunStatus, string> = {
  running: "border-2 border-orange-500 ring-2 ring-orange-500/40",
  ok: "border-emerald-500",
  fail: "border-rose-500",
  idle: "border-border",
};

function DiagramNode({ data, selected }: NodeProps<CanvasNode>) {
  // The lifecycle frame (draft = red) is independent of the run frame; a running node still shows orange.
  const frame =
    data.runStatus !== "idle"
      ? RUN_FRAME[data.runStatus]
      : data.draft
        ? "border-2 border-rose-500 border-dashed"
        : selected
          ? "border-primary ring-1 ring-primary"
          : "border-border";
  return (
    <div className={`relative w-48 rounded-md border bg-background px-3 py-2 text-sm shadow-sm ${frame}`}>
      <Handle type="target" position={Position.Left} />
      <p className="truncate font-medium">{data.label}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {data.runStatus === "running" ? "● running" : data.draft ? "draft — not built" : data.sub}
      </p>
      {data.builder && (
        <button
          type="button"
          aria-label="Add child node"
          title="Add child node"
          onClick={(e) => { e.stopPropagation(); data.onAddChild(data.cuid); }}
          className="absolute -right-3 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border bg-background shadow hover:bg-accent"
        >
          <Plus className="size-3.5" />
        </button>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const NODE_TYPES = { diagram: DiagramNode };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function DiagramCanvas({ nodes, automation }: { nodes: NodeContract[]; automation?: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<Record<string, RunStatus>>({});
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [builder, setBuilder] = useState(false);
  const [index, setIndex] = useState<IndexNode[]>([]);
  const [sources, setSources] = useState<Sources>({});
  // BATCHED save accumulator only now (step 236.1) — a drag no longer feeds rendering through this (that's
  // `flowNodes` below, via onNodesChange); this purely remembers what to send when Builder closes.
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [flowNodes, setFlowNodes, onFlowNodesChange] = useNodesState<CanvasNode>([]);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);

  // The index is polled every 3s. Re-setting it to a fresh array on EVERY poll — even when the data is
  // identical — churned the node identities, and ReactFlow re-measured the nodes and lost them in the
  // viewport (the owner's "the diagram appears, then a few seconds later the canvas goes blank"). So we
  // only setState when the CONTENT actually changed, by comparing a stable signature.
  const indexSig = useRef<string>("");
  const refetchIndex = useCallback(async () => {
    if (!automation) return;
    try {
      const r = await fetch(`/api/projects/nodes?automation=${encodeURIComponent(automation)}&withSources=1`, {
        cache: "no-store",
      });
      if (!r.ok) return;
      const d = (await r.json()) as { nodes: IndexNode[]; sources?: Sources };
      const nodes = d.nodes ?? [];
      const sig = JSON.stringify(nodes.map((n) => [n.cuid, n.slug, n.name, n.draft, n.active_version, n.x, n.y, n.parent_cuid, n.status]));
      if (sig === indexSig.current) return; // nothing changed — do NOT churn the canvas
      indexSig.current = sig;
      setIndex(nodes);
      setSources(d.sources ?? {});
    } catch { /* keep the last good index */ }
  }, [automation]);

  const refetchActive = useCallback(async () => {
    if (!automation) return;
    try {
      const r = await fetch(`/api/projects/runs/active?automation=${encodeURIComponent(automation)}`, {
        cache: "no-store",
      });
      if (!r.ok) return;
      const d = (await r.json()) as { run: { current_node: string | null } | null; nodes: Record<string, RunStatus> };
      setRunStatus(d.nodes ?? {});
      setCurrentNode(d.run?.current_node ?? null);
    } catch { /* leave as-is */ }
  }, [automation]);

  // LIVE canvas (step 227.C). The index is polled, not read once: while a coding agent builds the queued
  // nodes, the owner WATCHES the diagram update — a red draft turns into a built, versioned node the moment
  // it materializes, and a node the Quiz just designed appears without a reload. Same cheap DB-backed
  // pattern as the active-run poll; paused when the tab is hidden, so it costs nothing in the background.
  useEffect(() => {
    void refetchIndex();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void refetchIndex();
    }, 3000);
    return () => clearInterval(t);
  }, [refetchIndex]);
  useEffect(() => {
    if (!automation) return;
    void refetchActive();
    const t = setInterval(() => void refetchActive(), 1500);
    return () => clearInterval(t);
  }, [automation, refetchActive]);

  // The rendered node list: the live index (it has draft/version/layout and appears without a rebuild)
  // falls back to the build-time prop when the index has not seeded yet.
  const view = useMemo(() => {
    if (index.length) {
      return index.map((n) => ({
        id: n.slug, cuid: n.cuid, name: n.name, draft: n.draft === 1,
        sub: n.draft === 1 ? "draft" : `v${n.active_version}`,
        x: n.x, y: n.y, parentCuid: n.parent_cuid, node: n,
      }));
    }
    // Before the index seeds, fall back to the build-time nodes (a linear chain — they have no parent).
    return nodes.map((n, i) => ({
      id: n.id, cuid: n.cuid ?? n.id, name: n.name, draft: !!n.draft, sub: n.run,
      x: null as number | null, y: null as number | null,
      parentCuid: i > 0 ? (nodes[i - 1].cuid ?? nodes[i - 1].id) : null,
      node: undefined as IndexNode | undefined,
    }));
  }, [index, nodes]);

  // TREE layout (fixed in 224 L4.1 — the "+" adds a child OF THE CLICKED NODE, not at the end of the
  // chain). Depth from parent_cuid → x; the index among the siblings at that depth → y. A root (no parent)
  // chains after the previous root, so the default Input → Logic → Output still reads as a line, while a
  // child branches OFF its parent. A saved position always wins over the computed one.
  const layout = useMemo(() => {
    const byCuid = new Map(view.map((v) => [v.cuid, v]));
    const isRoot = (v: (typeof view)[number]) => !v.parentCuid || !byCuid.has(v.parentCuid);

    // A node's column: a root takes the next column in the root chain; a child takes its parent's column
    // + 1. Computed by walking up to the root (cycle-guarded).
    const rootCol = new Map<string, number>();
    view.filter(isRoot).forEach((v, i) => rootCol.set(v.cuid, i));
    const colOf = new Map<string, number>();
    const column = (cuid: string, guard = 0): number => {
      if (colOf.has(cuid)) return colOf.get(cuid) as number;
      const v = byCuid.get(cuid);
      const c =
        !v || isRoot(v) || guard > 50
          ? (rootCol.get(cuid) ?? 0)
          : column(v.parentCuid as string, guard + 1) + 1;
      colOf.set(cuid, c);
      return c;
    };

    const rowsUsed = new Map<number, number>(); // siblings in the same column stack downwards
    const pos = new Map<string, { x: number; y: number }>();
    for (const v of view) {
      const col = column(v.cuid);
      const row = rowsUsed.get(col) ?? 0;
      rowsUsed.set(col, row + 1);
      pos.set(v.cuid, { x: col * 260, y: row * 130 });
    }
    return pos;
  }, [view]);

  const addChild = useCallback(async (parentCuid: string) => {
    if (!automation || busy) return;
    setBusy(true);
    try {
      await fetch(`/api/projects/nodes/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation, name: "New node", parentCuid }),
      });
      await refetchIndex();
    } finally { setBusy(false); }
  }, [automation, busy, refetchIndex]);

  // MERGE into the live React Flow node array (step 236.1) — refreshes label/sub/draft/runStatus for a node
  // that already exists WITHOUT touching its position (that stays whatever onNodesChange/a drag last put it
  // at); a brand-new node (just materialized via addChild, or the very first load) gets its saved x/y, or the
  // computed tree position. This is what makes dragging live: `flowNodes` is genuine useNodesState now, not
  // re-derived from scratch every poll.
  useEffect(() => {
    setFlowNodes((current) => {
      const byId = new Map(current.map((n) => [n.id, n]));
      return view.map((v, i): CanvasNode => {
        const existing = byId.get(v.id);
        const position = existing
          ? existing.position
          : v.x !== null && v.y !== null
            ? { x: v.x, y: v.y }
            : (layout.get(v.cuid) ?? { x: i * 260, y: 0 });
        return {
          id: v.id, type: "diagram", position,
          data: {
            label: v.name, sub: v.sub, runStatus: runStatus[v.id] ?? "idle", draft: v.draft,
            builder, onAddChild: addChild, cuid: v.cuid,
          },
        };
      });
    });
  }, [view, runStatus, builder, layout, addChild, setFlowNodes]);

  const saveLayout = useCallback(async () => {
    if (!automation) return;
    const payload = Object.entries(positions).map(([cuid, p]) => ({ cuid, x: p.x, y: p.y }));
    if (!payload.length) return;
    await fetch(`/api/projects/nodes/layout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ automation, positions: payload }),
    });
  }, [automation, positions]);

  // AUTO-LAYOUT (step 224 L5) — arrange the nodes by the tree (depth → column, siblings → rows) and persist
  // it. Zero dependencies: the same computed `layout` the canvas falls back to, applied and saved. Manual
  // dragging still wins afterwards (the owner can arrange by hand; closing Builder saves that too).
  // Step 236.1: also pushes the new positions straight into `flowNodes` — the merge effect above ONLY ever
  // preserves an existing node's position, by design (that's what makes dragging live), so an explicit reset
  // like this one has to bypass it and set the visual position directly.
  const autoLayout = useCallback(async () => {
    if (!automation) return;
    const next: Record<string, { x: number; y: number }> = {};
    for (const v of view) {
      const p = layout.get(v.cuid);
      if (p) next[v.cuid] = p;
    }
    setPositions(next);
    setFlowNodes((current) => current.map((n) => {
      const v = view.find((x) => x.id === n.id);
      const p = v ? next[v.cuid] : undefined;
      return p ? { ...n, position: p } : n;
    }));
    await fetch(`/api/projects/nodes/layout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ automation, positions: Object.entries(next).map(([cuid, p]) => ({ cuid, ...p })) }),
    });
    await refetchIndex();
  }, [automation, view, layout, refetchIndex, setFlowNodes]);

  const toggleBuilder = useCallback(async () => {
    if (builder) { await saveLayout(); await refetchIndex(); } // leaving Builder persists the layout
    setBuilder((b) => !b);
    setActiveId(null);
  }, [builder, saveLayout, refetchIndex]);

  // 227.C — the smoke test. Runs through the BUILT nodes (the canvas shows them go green) and reports, in
  // plain language, what still has to be built. The owner always leaves a design session with something
  // they can run, never with a dead page.
  const testRun = useCallback(async () => {
    if (!automation || testing) return;
    setTesting(true);
    try {
      const r = await fetch(`/api/projects/test-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation }),
      });
      const d = (await r.json()) as { ok?: boolean; verdict?: string; report?: string; error?: string };
      if (!r.ok) { toast.error(d.error ?? "The test could not run."); return; }
      (d.ok ? toast.success : toast.info)(d.verdict ?? "Test finished", {
        description: d.report,
        duration: 20000,
      });
      await refetchIndex();
      await refetchActive();
    } finally {
      setTesting(false);
    }
  }, [automation, testing, refetchIndex, refetchActive]);

  const simulate = useCallback(async () => {
    if (!automation || simulating) return;
    setSimulating(true);
    try {
      const nodeIds = view.map((v) => v.id);
      for (let i = 0; i < nodeIds.length + 2; i++) {
        const r = await fetch(`/api/projects/runs/simulate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ automation, nodeIds }),
        });
        const d = (await r.json().catch(() => null)) as { status?: string } | null;
        await refetchActive();
        if (!r.ok || d?.status === "done") break;
        await sleep(1200);
      }
    } finally {
      setSimulating(false);
      void refetchActive();
    }
  }, [automation, view, refetchActive, simulating]);

  // Edges follow the TREE: a child links to ITS parent (parent_cuid). Roots chain to the previous root, so
  // the default Input → Logic → Output still reads as a line. This is what makes "+" branch off the clicked
  // node instead of appending to the end (the fatal bug the owner caught in L4).
  const rfEdges = useMemo<Edge[]>(() => {
    const byCuid = new Map(view.map((v) => [v.cuid, v]));
    const edges: Edge[] = [];
    let prevRoot: (typeof view)[number] | undefined;
    for (const v of view) {
      const parent = v.parentCuid ? byCuid.get(v.parentCuid) : undefined;
      if (parent) {
        edges.push({ id: `${parent.id}->${v.id}`, source: parent.id, target: v.id });
      } else {
        if (prevRoot) edges.push({ id: `${prevRoot.id}->${v.id}`, source: prevRoot.id, target: v.id });
        prevRoot = v;
      }
    }
    return edges;
  }, [view]);

  const activeView = activeId ? view.find((v) => v.id === activeId) : undefined;
  const activeContract = activeId ? nodes.find((n) => n.id === activeId) : undefined;

  // Re-fit the viewport only when the NODE SET changes (add / remove / draft→built), not on every run-status
  // poll — remounting ReactFlow re-runs `fitView` so a changed graph is centred, while a stable graph keeps
  // the owner's pan/zoom. The dedupe above means this key is stable between identical polls.
  const fitKey = useMemo(() => view.map((v) => v.id).join("|"), [view]);

  if (!view.length) return <DiagramPanel nodes={[]} />;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {builder ? (
            <span className="text-primary">Builder — add, edit or delete nodes; drag to arrange</span>
          ) : currentNode ? (
            <span className="text-orange-600 dark:text-orange-400">● running: {currentNode}</span>
          ) : (
            "Not running"
          )}
        </p>
        <div className="flex gap-2">
          {builder && (
            <Button variant="outline" size="sm" onClick={autoLayout} disabled={busy}>
              <LayoutGrid className="size-3.5" /> Auto-layout
            </Button>
          )}
          <Button variant={builder ? "default" : "outline"} size="sm" onClick={toggleBuilder} disabled={busy}>
            <Hammer className="size-3.5" />
            {builder ? "Close Builder" : "Builder"}
          </Button>
          {!builder && automation && (
            <>
              {/* START DEVELOPMENT (step 232) — appears while any node is still a draft: it turns the current
                  draft nodes into development steps and hands the owner the copy-paste brief for a coding agent. */}
              <StartDevelopment automation={automation} hasDraft={view.some((v) => v.draft)} />
              {/* THE MINIMAL TEST GUARANTEE (227.C): even an unfinished automation can be tested — the smoke
                  run goes through what is BUILT and reports honestly what is still missing. */}
              <Button variant="outline" size="sm" onClick={testRun} disabled={testing}>
                <FlaskConical className="size-3.5" />
                {testing ? "Testing…" : "Test automation"}
              </Button>
              <Button variant="outline" size="sm" onClick={simulate} disabled={simulating}>
                <Play className="size-3.5" />
                {simulating ? "Simulating…" : "Simulate run"}
              </Button>
            </>
          )}
        </div>
      </div>
      {/* Canvas size (owner): 75% of the screen height; the width comes from its host section (the standard
          85vw column), so both canvases and every other block share one width. */}
      <div className="relative h-[75vh] w-full overflow-hidden rounded-lg border">
        <ReactFlow
          key={fitKey}
          nodes={flowNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onFlowNodesChange}
          onNodeClick={(_, node) => setActiveId(node.id)}
          onPaneClick={() => setActiveId(null)}
          onNodeDragStop={(_, node) => {
            // onFlowNodesChange already applied the live drag to `flowNodes` (that's what makes it live,
            // step 236.1) — this just remembers the FINAL position for the batched save-on-Builder-close
            // (`positions`/`saveLayout` below), unchanged from before.
            const v = view.find((x) => x.id === node.id);
            if (v) setPositions((p) => ({ ...p, [v.cuid]: { x: node.position.x, y: node.position.y } }));
          }}
          nodesConnectable={false}
          nodesDraggable={builder}
          deleteKeyCode={null}
          fitView
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
        {activeView && (
          <aside className="absolute inset-y-0 right-0 w-80 space-y-3 overflow-y-auto border-l bg-background/95 p-4">
            <div className="flex items-center justify-end">
              <button
                type="button"
                aria-label="Close node panel"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setActiveId(null)}
              >
                <X className="size-4" />
              </button>
            </div>
            {builder && activeView.node ? (
              <BuilderNodePanel
                node={activeView.node}
                spec={sources[activeView.cuid]?.spec ?? ""}
                instruction={sources[activeView.cuid]?.instruction ?? ""}
                onChanged={() => void refetchIndex()}
                onDeleted={() => { setActiveId(null); void refetchIndex(); }}
              />
            ) : activeContract ? (
              <NodeCard node={activeContract} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {activeView.draft ? "Draft — not built yet. Open Builder to write its brief." : "No contract built yet."}
              </p>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
