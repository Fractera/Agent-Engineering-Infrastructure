"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background, Controls, Handle, Position, ReactFlow,
  type Connection, type Edge, type Node, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CircleDot, LayoutGrid, Loader2, Power, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlobalEdgePanel } from "./global-edge-panel.client";

// THE GLOBAL AUTOMATION CANVAS (step 225) — the workspace-level graph, on /projects BELOW the category
// cards. Every PROJECT is a node; every EDGE is a programmable integration BETWEEN two automations. This is
// the "automated global architecture": how projects depend on each other's actions.
//
// THE READINESS GATE (the step's central rule): a custom link may be drawn ONLY between projects whose
// development is FINISHED — creating an edge always changes its endpoint nodes, so they must be built
// first. A project still IN DEVELOPMENT (or inactive) is painted FULL RED; dragging a link from or to it
// creates nothing: the attempted link is drawn RED DASHED, bolds on hover, and on click explains itself in
// an error toast.
type GProject = { automation: string; category: string; slug: string; ready: boolean; nodes: number; drafts: number };
type GEdge = {
  cuid: string; from_automation: string; to_automation: string; name: string; draft: number;
  active_version: number; from_node_cuid: string | null; to_node_cuid: string | null;
};
type GState = { projects: GProject[]; edges: GEdge[]; status: string; draftEdges: number; layout: Record<string, { x: number; y: number }> };

type PData = { label: string; sub: string; ready: boolean };
type PNode = Node<PData, "project">;

function ProjectNode({ data, selected }: NodeProps<PNode>) {
  // FULL RED = in development or inactive — it cannot be an edge endpoint yet.
  const frame = !data.ready
    ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300"
    : selected
      ? "border-primary ring-1 ring-primary"
      : "border-border";
  return (
    <div className={`w-52 rounded-lg border-2 bg-background px-3 py-2 text-sm shadow-sm ${frame}`}>
      <Handle type="target" position={Position.Left} />
      <p className="truncate font-medium">{data.label}</p>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{data.sub}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const NODE_TYPES = { project: ProjectNode };

const STATUS_PILL: Record<string, string> = {
  "in-development": "bg-indigo-500",
  on: "bg-green-500",
  off: "bg-muted-foreground",
};

export function GlobalCanvas() {
  const [state, setState] = useState<GState | null>(null);
  const [activeEdge, setActiveEdge] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [busy, setBusy] = useState(false);

  const refetch = useCallback(async () => {
    const r = await fetch("/api/projects/global", { cache: "no-store" });
    if (!r.ok) return;
    const d = (await r.json()) as GState;
    setState(d);
    setPositions((p) => (Object.keys(p).length ? p : d.layout ?? {}));
  }, []);

  useEffect(() => {
    void refetch();
    const t = setInterval(() => { if (document.visibilityState === "visible") void refetch(); }, 4000);
    return () => clearInterval(t);
  }, [refetch]);

  // Drawing a link → THE GATE. The server is the authority (it refuses with 409 + the reason); the canvas
  // simply surfaces that refusal, so the rule can never be bypassed from the client.
  const onConnect = useCallback(async (c: Connection) => {
    if (!c.source || !c.target || busy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/projects/edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: c.source, to: c.target }),
      });
      const d = (await r.json()) as { ok?: boolean; error?: string; blocked?: boolean; edge?: GEdge };
      if (r.status === 409 || d.blocked) {
        toast.error("This link cannot be created", { description: d.error, duration: 15000 });
        return;
      }
      if (!r.ok) { toast.error(d.error ?? "Could not create the link."); return; }
      toast.success("Link created — describe how these automations are connected, then start development.", { duration: 12000 });
      await refetch();
      if (d.edge) setActiveEdge(d.edge.cuid);
    } finally { setBusy(false); }
  }, [busy, refetch]);

  const saveLayout = useCallback(async (next: Record<string, { x: number; y: number }>) => {
    await fetch("/api/projects/global", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: next }),
    });
  }, []);

  const autoLayout = useCallback(async () => {
    if (!state) return;
    const next: Record<string, { x: number; y: number }> = {};
    state.projects.forEach((p, i) => {
      next[p.automation] = { x: (i % 3) * 280, y: Math.floor(i / 3) * 160 };
    });
    setPositions(next);
    await saveLayout(next);
  }, [state, saveLayout]);

  const toggleGlobal = useCallback(async () => {
    if (!state) return;
    const next = state.status === "off" ? "on" : "off";
    await fetch("/api/projects/global", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    toast.info(
      next === "off" ? "Global automation is OFF" : "Global automation is ON",
      {
        description: next === "off"
          ? "The projects keep running exactly as before — only the synchronisation between them stops."
          : "The projects synchronise through their links again.",
        duration: 12000,
      },
    );
    await refetch();
  }, [state, refetch]);

  const rfNodes = useMemo<PNode[]>(() => {
    if (!state) return [];
    return state.projects.map((p, i) => ({
      id: p.automation,
      type: "project",
      position: positions[p.automation] ?? { x: (i % 3) * 280, y: Math.floor(i / 3) * 160 },
      data: {
        label: p.slug,
        sub: p.ready ? `${p.nodes} nodes · ready` : `in development · ${p.drafts} to build`,
        ready: p.ready,
      },
    }));
  }, [state, positions]);

  const rfEdges = useMemo<Edge[]>(() => {
    if (!state) return [];
    return state.edges.map((e) => ({
      id: e.cuid,
      source: e.from_automation,
      target: e.to_automation,
      label: e.draft ? `${e.name} (draft)` : `${e.name} v${e.active_version}`,
      animated: e.draft === 1,
      style: e.draft ? { stroke: "#f43f5e", strokeDasharray: "6 4", strokeWidth: 2 } : { strokeWidth: 2 },
    }));
  }, [state]);

  // The section (heading + intro) is ALWAYS rendered — it is the product's statement of what the global
  // architecture IS; only the graph itself waits for the first poll.
  if (!state) {
    return (
      <section className="mt-10">
        <h2 className="text-xl font-semibold">Global architecture</h2>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading the workspace graph…
        </p>
      </section>
    );
  }

  const edge = activeEdge ? state.edges.find((e) => e.cuid === activeEdge) : undefined;

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Global architecture</h2>
          <p className="text-sm text-muted-foreground">
            Every project is a node; a link is a programmable integration between two automations. Links can
            only be drawn between projects whose development is finished.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
            <span className={`size-2.5 rounded-full ${STATUS_PILL[state.status] ?? "bg-muted"}`} aria-hidden />
            {state.status === "in-development" ? "In development" : state.status === "on" ? "On" : "Off"}
          </span>
          <Button variant="outline" size="sm" onClick={autoLayout}>
            <LayoutGrid className="size-3.5" /> Auto-layout
          </Button>
          <Button variant="outline" size="sm" onClick={toggleGlobal}>
            <Power className="size-3.5" /> {state.status === "off" ? "Turn on" : "Turn off"}
          </Button>
        </div>
      </div>

      <div className="relative h-[70vh] w-full overflow-hidden rounded-lg border">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          onConnect={onConnect}
          onEdgeClick={(_, e) => setActiveEdge(e.id)}
          onNodeDragStop={(_, n) => {
            const next = { ...positions, [n.id]: { x: n.position.x, y: n.position.y } };
            setPositions(next);
            void saveLayout(next);
          }}
          nodesConnectable
          deleteKeyCode={null}
          fitView
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>

        {edge && (
          <aside className="absolute inset-y-0 right-0 w-96 space-y-3 overflow-y-auto border-l bg-background/95 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <CircleDot className="size-4" /> Link
              </p>
              <button type="button" aria-label="Close" onClick={() => setActiveEdge(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <GlobalEdgePanel
              edge={edge}
              onChanged={() => void refetch()}
              onDeleted={() => { setActiveEdge(null); void refetch(); }}
            />
          </aside>
        )}
      </div>
    </section>
  );
}
