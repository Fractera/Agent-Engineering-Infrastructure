"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background, Controls, Handle, NodeResizer, Position, ReactFlow, ReactFlowProvider, useReactFlow,
  type Connection, type Edge, type Node, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Boxes, CircleDot, LayoutGrid, Lock, Loader2, Plus, Power, Unlock, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlobalEdgePanel } from "./global-edge-panel.client";
import { GlobalProjectPanel } from "./global-project-panel.client";
import { CreateAutomationDialog } from "./create-automation-card.client";
import { ActivationQuiz } from "./activation-quiz.client";

// THE GLOBAL AUTOMATION CANVAS (step 225) — the workspace-level graph, on /projects BELOW the category
// cards. Every PROJECT is a node; every EDGE is a programmable integration BETWEEN two automations. This is
// the "automated global architecture": how projects depend on each other's actions.
//
// THE READINESS GATE (the step's central rule): a custom link may be drawn ONLY between projects whose
// development is FINISHED — creating an edge always changes its endpoint nodes, so they must be built
// first. A project still IN DEVELOPMENT (or inactive) is painted FULL RED; dragging a link from or to it
// creates nothing: the attempted link is drawn RED DASHED, bolds on hover, and on click explains itself in
// an error toast.
//
// GROUP/SUBFLOW CONTAINERS (step 234.3, English-only for now — no i18n on this feature until it is built and
// tested, owner's explicit call): a "chained" automation renders as a GROUP node other automation nodes can
// be dragged into (React Flow's own parentId/extent:'parent' sub-flow pattern — see reactflow.dev/learn/
// layouting/sub-flows). A group is LOCKED by default; unlocking it (its own lock button) allows exactly one
// membership change (drag a node in, or out), then it re-locks after 5s, on a second click, or on reload —
// this lock state is NEVER persisted, pure client-side/ephemeral. An automation nested inside a group cannot
// be a custom-edge endpoint (THE NESTING GATE, enforced client-side here for instant feedback AND
// server-side in app/api/projects/edges/route.ts as the authority).
type GProject = { automation: string; category: string; slug: string; ready: boolean; nodes: number; drafts: number; type?: "stream" | "instanced" | "chained" };
type GEdge = {
  cuid: string; from_automation: string; to_automation: string; name: string; draft: number;
  active_version: number; from_node_cuid: string | null; to_node_cuid: string | null;
};
// LayoutEntry mirrors lib/edges.ts's server-side type (kept as a local mirror, not a cross-boundary import,
// since this is a "use client" component — the two shapes must be kept in sync by hand).
type LayoutEntry = { x: number; y: number; parent?: string | null; width?: number; height?: number };
type GState = { projects: GProject[]; edges: GEdge[]; status: string; draftEdges: number; layout: Record<string, LayoutEntry> };

type PData = { label: string; sub: string; ready: boolean; type: "stream" | "instanced" | "chained" };
type PNode = Node<PData, "project">;

type GroupData = { label: string; ready: boolean; unlocked: boolean; onToggleLock: () => void; onResize: (w: number, h: number) => void };
type GroupNode = Node<GroupData, "chainGroup">;

// The immutable automation TYPE badge (step 224 §1.5, extended 234) — so the three kinds are told apart at a
// glance: STREAM (turquoise) = no forks, every event runs the same scheme (telegram-notes); INSTANCED
// (violet) = each run forks Master → Instance with its own parameters (the post-publishing automations);
// CHAINED (sky) = a link in a chain of separate automations, connected by an event — renders as a group.
const TYPE_INFO: Record<string, { label: string; title: string; badge: string }> = {
  stream: {
    label: "Stream", badge: "border-teal-500 text-teal-600 dark:text-teal-400",
    title: "Stream — no forks; every incoming event runs the same scheme end to end",
  },
  instanced: {
    label: "Instanced", badge: "border-violet-500 text-violet-600 dark:text-violet-400",
    title: "Instanced — each run forks Master → Instance with its own parameters (can be deferred and tracked)",
  },
  chained: {
    label: "Chained", badge: "border-sky-500 text-sky-600 dark:text-sky-400",
    title: "Chained — a link in a chain of separate automations, connected by an event (not a standalone run)",
  },
};

function ProjectNode({ data, selected }: NodeProps<PNode>) {
  // FULL RED = in development or inactive — it cannot be an edge endpoint yet.
  const frame = !data.ready
    ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300"
    : selected
      ? "border-primary ring-1 ring-primary"
      : "border-border";
  const info = TYPE_INFO[data.type] ?? TYPE_INFO.stream;
  return (
    <div className={`w-52 rounded-lg border-2 bg-background px-3 py-2 text-sm shadow-sm ${frame}`}>
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between gap-1">
        <p className="truncate font-medium">{data.label}</p>
        <span
          className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] font-medium uppercase ${info.badge}`}
          title={info.title}
        >
          {info.label}
        </span>
      </div>
      <p className="text-[10px] uppercase tracking-wide opacity-70">{data.sub}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// THE GROUP CONTAINER for a "chained" automation (step 234.3) — a box other automation nodes can be dragged
// into (global-canvas.client.tsx's onNodeDragStop does the reparenting via getIntersectingNodes). Resizable
// (NodeResizer, always active — resizing is NOT lock-gated, only membership changes are) and, like any other
// automation, can itself be a top-level edge endpoint (Handles) — only ITS CHILDREN are blocked from edges.
function ChainGroupNode({ data, selected }: NodeProps<GroupNode>) {
  const frame = !data.ready
    ? "border-red-500 bg-red-500/10"
    : selected
      ? "border-primary ring-1 ring-primary"
      : "border-sky-500/60";
  return (
    <div className={`flex h-full w-full flex-col rounded-lg border-2 bg-sky-500/5 ${frame}`}>
      <NodeResizer
        minWidth={260}
        minHeight={180}
        onResizeEnd={(_, params) => data.onResize(params.width, params.height)}
      />
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between gap-2 rounded-t-md border-b bg-background/80 px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] font-medium uppercase ${TYPE_INFO.chained.badge}`} title={TYPE_INFO.chained.title}>
            Chained
          </span>
          <p className="truncate text-sm font-medium">{data.label}</p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); data.onToggleLock(); }}
          className={`shrink-0 rounded p-1 hover:bg-muted ${data.unlocked ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
          title={data.unlocked
            ? "Unlocked — drag an automation in (or out), then it locks again in a few seconds. Click to lock now."
            : "Locked — click to unlock before dragging an automation in or out"}
        >
          {data.unlocked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
        </button>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const NODE_TYPES = { project: ProjectNode, chainGroup: ChainGroupNode };
// Default box size for a fresh group with no saved dimensions yet, and the estimated footprint of a plain
// project box — both feed the overlap-avoidance placement (rule 3) and the reparent position math.
const GROUP_DEFAULT = { width: 420, height: 280 };
const PROJECT_FOOTPRINT = { width: 220, height: 90 };

const STATUS_PILL: Record<string, string> = {
  "in-development": "bg-indigo-500",
  on: "bg-green-500",
  off: "bg-muted-foreground",
};

// THE QUIZ FROM THE CANVAS (step 225 G4) — the design session is opened right here, on whichever subject
// the owner picked: a BRAND-NEW automation (created from the canvas, auto-quiz streaming straight away), an
// EXISTING automation (resumes its session), or a LINK between two of them. One component (ActivationQuiz),
// three subjects — there is no second Quiz anywhere.
type QuizSubject =
  | { kind: "project"; automation: string; auto: boolean }
  | { kind: "edge"; cuid: string; name: string };

// React Flow needs a ReactFlowProvider ANCESTOR for useReactFlow() (getIntersectingNodes/getNode — used by
// the drag-into-group logic below) to work — the component that itself renders <ReactFlow> cannot call the
// hook directly. GlobalCanvas is now a thin provider wrapper; GlobalCanvasInner carries all the logic.
export function GlobalCanvas() {
  return (
    <ReactFlowProvider>
      <GlobalCanvasInner />
    </ReactFlowProvider>
  );
}

function GlobalCanvasInner() {
  const [state, setState] = useState<GState | null>(null);
  const [activeEdge, setActiveEdge] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, LayoutEntry>>({});
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [quiz, setQuiz] = useState<QuizSubject | null>(null);
  // Bumped when a Quiz closes: the panels re-read the files the session just wrote (the link's spec.md).
  const [panelKey, setPanelKey] = useState(0);
  // GROUP LOCK STATE (step 234.3) — deliberately NOT persisted (owner's rule): a Set of currently-unlocked
  // group automations + a pending auto-relock timer per group, so unlock -> drag -> relock (5s, or an early
  // re-click of the same button, or simply a reload) all just work on plain client state.
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const lockTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const rf = useReactFlow();

  const toggleLock = useCallback((automation: string) => {
    setUnlocked((prev) => {
      const next = new Set(prev);
      clearTimeout(lockTimers.current[automation]);
      delete lockTimers.current[automation];
      if (next.has(automation)) {
        next.delete(automation);
      } else {
        next.add(automation);
        lockTimers.current[automation] = setTimeout(() => {
          setUnlocked((p) => { const n = new Set(p); n.delete(automation); return n; });
          delete lockTimers.current[automation];
        }, 5000);
      }
      return next;
    });
  }, []);

  useEffect(() => () => { Object.values(lockTimers.current).forEach(clearTimeout); }, []);

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

  const saveLayout = useCallback(async (next: Record<string, LayoutEntry>) => {
    await fetch("/api/projects/global", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: next }),
    });
  }, []);

  // OVERLAP-AVOIDANCE PLACEMENT (rule 3) — an automation with no saved position yet gets the first free grid
  // cell that doesn't intersect any already-positioned node's real (or default) footprint, scanning against
  // the whole current layout AND every other new arrival placed earlier in the same pass, then the batch is
  // persisted once. Replaces the old per-render "index % 3" fallback, which never checked real occupied
  // space and could overlap once nodes had been dragged around.
  useEffect(() => {
    if (!state) return;
    const missing = state.projects.filter((p) => !positions[p.automation]);
    if (!missing.length) return;
    const CELL_X = 280, CELL_Y = 160, MARGIN = 20;
    const occupied: { x: number; y: number; w: number; h: number }[] = [];
    for (const p of state.projects) {
      const entry = positions[p.automation];
      if (!entry || entry.parent) continue; // nested children don't compete for top-level grid space
      const size = p.type === "chained"
        ? { w: entry.width ?? GROUP_DEFAULT.width, h: entry.height ?? GROUP_DEFAULT.height }
        : { w: PROJECT_FOOTPRINT.width, h: PROJECT_FOOTPRINT.height };
      occupied.push({ x: entry.x, y: entry.y, ...size });
    }
    const overlapsAny = (x: number, y: number, w: number, h: number) =>
      occupied.some((o) => x < o.x + o.w + MARGIN && x + w + MARGIN > o.x && y < o.y + o.h + MARGIN && y + h + MARGIN > o.y);
    const freeSlot = (w: number, h: number) => {
      for (let row = 0; row < 200; row++) {
        for (let col = 0; col < 12; col++) {
          const x = col * CELL_X, y = row * CELL_Y;
          if (!overlapsAny(x, y, w, h)) return { x, y };
        }
      }
      return { x: 0, y: 0 };
    };
    const next = { ...positions };
    for (const p of missing) {
      const w = p.type === "chained" ? GROUP_DEFAULT.width : PROJECT_FOOTPRINT.width;
      const h = p.type === "chained" ? GROUP_DEFAULT.height : PROJECT_FOOTPRINT.height;
      const slot = freeSlot(w, h);
      next[p.automation] = { x: slot.x, y: slot.y };
      occupied.push({ x: slot.x, y: slot.y, w, h });
    }
    setPositions(next);
    void saveLayout(next);
    // Deliberately state-only: positions/saveLayout are read fresh from this render's closure each time this
    // fires, but must not themselves retrigger it (that would loop against the setPositions call above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Drawing a link → THE GATE. THE NESTING GATE (rule 2) is checked first, client-side, instant — no network
  // round trip needed since the layout is already in memory. Then the readiness gate: the server is the
  // authority there (it refuses with 409 + the reason); the canvas simply surfaces that refusal, so neither
  // rule can be bypassed from the client.
  const onConnect = useCallback(async (c: Connection) => {
    if (!c.source || !c.target || busy) return;
    if (positions[c.source]?.parent || positions[c.target]?.parent) {
      toast.error("This link cannot be created", {
        description: "Automations nested inside a group cannot be linked directly — move it out of the group first.",
        duration: 15000,
      });
      return;
    }
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
      if (d.edge) { setActiveProject(null); setActiveEdge(d.edge.cuid); }
    } finally { setBusy(false); }
  }, [busy, refetch, positions]);

  // GROUP MEMBERSHIP via drag (rule 1 + 4) — the canvas is fully CONTROLLED (nodes={rfNodes}, no
  // onNodesChange at all), so REJECTING a drop is simply not writing the change to `positions`: on the next
  // render rfNodes recomputes from the last-committed position and React Flow snaps the node back on its
  // own — no manual "revert" code needed. Children are NOT given extent:'parent' (deliberately — that would
  // physically prevent the drag-OUT gesture the owner's symmetric removal case needs).
  const onNodeDragStop = useCallback((_: unknown, n: Node) => {
    if (n.type !== "project") {
      const next = { ...positions, [n.id]: { ...positions[n.id], x: n.position.x, y: n.position.y } };
      setPositions(next);
      void saveLayout(next);
      return;
    }
    const currentParent = positions[n.id]?.parent ?? undefined;
    const hitGroup = rf.getIntersectingNodes({ id: n.id }).find((o) => o.type === "chainGroup");

    if (hitGroup && hitGroup.id !== currentParent) {
      if (!unlocked.has(hitGroup.id)) {
        toast.error("This group is locked", {
          description: "Unlock it first (the lock button on the group), then drag the automation in.",
          duration: 15000,
        });
        return;
      }
      const oldParentNode = currentParent ? rf.getNode(currentParent) : undefined;
      const abs = oldParentNode
        ? { x: n.position.x + oldParentNode.position.x, y: n.position.y + oldParentNode.position.y }
        : { x: n.position.x, y: n.position.y };
      const rel = { x: abs.x - hitGroup.position.x, y: abs.y - hitGroup.position.y };
      const next = { ...positions, [n.id]: { x: rel.x, y: rel.y, parent: hitGroup.id } };
      setPositions(next); void saveLayout(next);
      return;
    }
    if (!hitGroup && currentParent) {
      if (!unlocked.has(currentParent)) {
        toast.error("This group is locked", {
          description: "Unlock it first (the lock button on the group), then drag the automation out.",
          duration: 15000,
        });
        return;
      }
      const oldParentNode = rf.getNode(currentParent);
      const abs = { x: n.position.x + (oldParentNode?.position.x ?? 0), y: n.position.y + (oldParentNode?.position.y ?? 0) };
      const next = { ...positions, [n.id]: { x: abs.x, y: abs.y, parent: undefined } };
      setPositions(next); void saveLayout(next);
      return;
    }
    // Same group as before (or still top-level, no new group hit) — n.position is already in the right
    // coordinate space (relative if parented, absolute if not) since parentage did not change.
    const next = { ...positions, [n.id]: { ...positions[n.id], x: n.position.x, y: n.position.y } };
    setPositions(next);
    void saveLayout(next);
  }, [positions, unlocked, rf, saveLayout]);

  const autoLayout = useCallback(async () => {
    if (!state) return;
    // Only repositions TOP-LEVEL nodes onto a fresh grid — a nested child's position stays exactly as saved
    // (relative to its group), so auto-layout never silently un-nests anything.
    const next: Record<string, LayoutEntry> = { ...positions };
    const topLevel = state.projects.filter((p) => !positions[p.automation]?.parent);
    topLevel.forEach((p, i) => {
      next[p.automation] = { ...next[p.automation], x: (i % 3) * 280, y: Math.floor(i / 3) * 160 };
    });
    setPositions(next);
    await saveLayout(next);
  }, [state, positions, saveLayout]);

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

  const rfNodes = useMemo<(PNode | GroupNode)[]>(() => {
    if (!state) return [];
    const top: (PNode | GroupNode)[] = [];
    const children: PNode[] = [];
    state.projects.forEach((p, i) => {
      const entry = positions[p.automation];
      const fallback = { x: (i % 3) * 280, y: Math.floor(i / 3) * 160 }; // transient, until the placement effect above corrects it
      if (p.type === "chained") {
        top.push({
          id: p.automation,
          type: "chainGroup",
          position: entry ? { x: entry.x, y: entry.y } : fallback,
          style: { width: entry?.width ?? GROUP_DEFAULT.width, height: entry?.height ?? GROUP_DEFAULT.height },
          data: {
            label: p.slug,
            ready: p.ready,
            unlocked: unlocked.has(p.automation),
            onToggleLock: () => toggleLock(p.automation),
            onResize: (w: number, h: number) => {
              const base = positions[p.automation] ?? { x: fallback.x, y: fallback.y };
              const next = { ...positions, [p.automation]: { ...base, width: w, height: h } };
              setPositions(next);
              void saveLayout(next);
            },
          },
        });
        return;
      }
      const node: PNode = {
        id: p.automation,
        type: "project",
        position: entry ? { x: entry.x, y: entry.y } : fallback,
        data: {
          label: p.slug,
          sub: p.ready ? `${p.nodes} nodes · ready` : `in development · ${p.drafts} to build`,
          ready: p.ready,
          type: p.type ?? "stream",
        },
      };
      // A parent reference only counts when that automation still exists AND is really a group — a stale
      // reference (the group was deleted) degrades to a plain top-level node instead of vanishing.
      if (entry?.parent && state.projects.some((g) => g.automation === entry.parent && g.type === "chained")) {
        children.push({ ...node, parentId: entry.parent });
      } else {
        top.push(node);
      }
    });
    // React Flow requires parent nodes before their children in the array.
    return [...top, ...children];
  }, [state, positions, unlocked, toggleLock, saveLayout]);

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
  const project = activeProject ? state.projects.find((p) => p.automation === activeProject) : undefined;

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Global architecture</h2>
          <p className="text-sm text-muted-foreground">
            Every project is a node; a link is a programmable integration between two automations. Links can
            only be drawn between projects whose development is finished. A Chained automation renders as a
            group — unlock it to drag other automations inside; a nested automation cannot be linked directly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
            <span className={`size-2.5 rounded-full ${STATUS_PILL[state.status] ?? "bg-muted"}`} aria-hidden />
            {state.status === "in-development" ? "In development" : state.status === "on" ? "On" : "Off"}
          </span>
          {/* A new automation is born FROM THE GLOBAL VIEW (step 225 G4) — the same single entry
              POST /api/projects/create (never a second code path); the only difference from a category
              grid's "+" card is that the canvas has no ambient category, so the modal asks for one. The
              moment it exists, its Quiz opens here and the auto-quiz starts streaming. */}
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> Add automation
          </Button>
          <Button variant="outline" size="sm" onClick={autoLayout}>
            <LayoutGrid className="size-3.5" /> Auto-layout
          </Button>
          <Button variant="outline" size="sm" onClick={toggleGlobal}>
            <Power className="size-3.5" /> {state.status === "off" ? "Turn on" : "Turn off"}
          </Button>
        </div>
      </div>

      {/* Canvas size (owner): 75% of the screen height; the width comes from its host section, which is the
          standard 85vw column — so the canvas fills it exactly like every other block on the page. */}
      <div className="relative h-[75vh] w-full overflow-hidden rounded-lg border">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          onConnect={onConnect}
          onEdgeClick={(_, e) => { setActiveProject(null); setActiveEdge(e.id); }}
          onNodeClick={(_, n) => { setActiveEdge(null); setActiveProject(n.id); }}
          onNodeDragStop={onNodeDragStop}
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
              key={`${edge.cuid}-${panelKey}`}
              edge={edge}
              onChanged={() => void refetch()}
              onDeleted={() => { setActiveEdge(null); void refetch(); }}
              onQuiz={() => setQuiz({ kind: "edge", cuid: edge.cuid, name: edge.name })}
            />
          </aside>
        )}

        {/* THE PROJECT PANEL (step 225 G4) — a click on a project node opens it: Open / Builder / Quiz. */}
        {project && !edge && (
          <aside className="absolute inset-y-0 right-0 w-96 space-y-3 overflow-y-auto border-l bg-background/95 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Boxes className="size-4" /> Automation
              </p>
              <button type="button" aria-label="Close" onClick={() => setActiveProject(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <GlobalProjectPanel
              project={project}
              onQuiz={() => setQuiz({ kind: "project", automation: project.automation, auto: false })}
            />
          </aside>
        )}
      </div>

      {/* PHASE 1 from the canvas: the creation modal (category picked in the dropdown) → the new automation
          exists → PHASE 2 opens immediately, auto-quiz streaming, without waiting for its page to build. */}
      <CreateAutomationDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(automation) => {
          setQuiz({ kind: "project", automation, auto: true });
          void refetch();
        }}
      />

      {quiz && (
        <ActivationQuiz
          key={quiz.kind === "edge" ? `edge:${quiz.cuid}` : quiz.automation}
          open
          automation={quiz.kind === "project" ? quiz.automation : undefined}
          edge={quiz.kind === "edge" ? quiz.cuid : undefined}
          edgeName={quiz.kind === "edge" ? quiz.name : undefined}
          autoStart={quiz.kind === "project" ? quiz.auto : false}
          onClose={() => { setQuiz(null); setPanelKey((k) => k + 1); void refetch(); }}
        />
      )}
    </section>
  );
}
