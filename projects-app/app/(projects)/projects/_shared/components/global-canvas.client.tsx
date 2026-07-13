"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background, Controls, Handle, NodeResizer, Position, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow,
  type Connection, type Edge, type Node, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Boxes, CircleDot, Eye, LayoutGrid, Lock, Loader2, Plus, Power, Unlock, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GlobalEdgePanel } from "./global-edge-panel.client";
import { GlobalProjectPanel } from "./global-project-panel.client";
import { GroupDetailCanvas } from "./group-detail-canvas.client";
import { CreateAutomationDialog } from "./create-automation-card.client";
import { ActivationQuiz } from "./activation-quiz.client";
import { useUiLang } from "../use-ui-lang";
import { globalCanvasStrings } from "../global-canvas-i18n";

// THE GLOBAL AUTOMATION CANVAS (step 225) — the workspace-level graph, on /projects BELOW the category
// cards. Every PROJECT is a node; every EDGE is a programmable integration BETWEEN two automations. This is
// the "automated global architecture": how projects depend on each other's actions.
//
// GROUP/SUBFLOW CONTAINERS (step 234.3): a "chained" automation renders as a GROUP node other automation
// nodes can be dragged into (React Flow's own parentId sub-flow pattern — see reactflow.dev/learn/layouting/
// sub-flows). A group is LOCKED by default; unlocking it (its own lock button) allows exactly one membership
// change (drag a node in, or out), then it re-locks after 5s, on a second click, or on reload — this lock
// state is NEVER persisted, pure client-side/ephemeral.
//
// THE CONNECTION RULE (step 236.3, replaces the old readiness gate AND the earlier, inverted nesting gate):
// a link may be drawn ONLY between two automations that are members of the SAME group — a group's members
// ARE the chain, and edges are how that chain gets defined. Draft/readiness state no longer matters at all.
// Enforced client-side here for instant feedback AND server-side in app/api/projects/edges/route.ts as the
// authority (lib/edges.ts sameGroup()).
//
// STEP 236.1 — NODE-STATE ARCHITECTURE FIX (owner tested 236, found drag wasn't live and a locked-group
// rejection left the node visually inside anyway): the original 236 build passed a fully re-derived
// `useMemo`'d nodes array to a controlled <ReactFlow> with NO onNodesChange handler. React Flow's own docs
// are explicit that this breaks live dragging — "if this handler doesn't exist... the node appears frozen
// visually despite internal React Flow tracking the drag" (reactflow.dev/learn/troubleshooting +
// /learn/concepts/adding-interactivity, verified, not assumed). Fixed by adopting the real useNodesState/
// onNodesChange pattern: `nodes` is now genuine local state, position/parentId/size are "local-authoritative
// once created" (a poll only ever refreshes DATA fields — label/ready/type — for automations already on the
// canvas; it never touches their position/parent/size again), and a locked-group rejection is reverted with
// an EXPLICIT rf.updateNode(id, {position}) call (the confirmed real ReactFlowInstance API) rather than
// hoping an unrelated re-render would snap it back — it doesn't, there is nothing to snap back FROM without
// onNodesChange wired.
// KNOWN TRADE-OFF: because position/parentId is local-authoritative after creation, a SECOND browser tab's
// own drag/reparent is not live-reflected in this tab until a full reload. Accepted deliberately — the
// alternative (server-truth-wins-every-poll) is exactly what caused the drag-fighting bug being fixed here.
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

type GroupData = {
  label: string; ready: boolean; unlocked: boolean; memberCount: number;
  onToggleLock: (id: string) => void; onResize: (id: string, w: number, h: number) => void;
  /** step 237 — the eye icon opens GroupDetailCanvas for this group. */
  onOpenDetail: (id: string) => void;
};
type GroupNode = Node<GroupData, "chainGroup">;
type AnyNode = PNode | GroupNode;

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
// `id` comes from NodeProps (React Flow's own node id) so onToggleLock/onResize can be STABLE top-level
// callbacks (never recreated per node, per merge) instead of a per-node closure baked into `data`.
function ChainGroupNode({ id, data, selected }: NodeProps<GroupNode>) {
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
        onResizeEnd={(_, params) => data.onResize(id, params.width, params.height)}
      />
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center justify-between gap-2 rounded-t-md border-b bg-background/80 px-2 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`shrink-0 rounded-full border px-1.5 py-px text-[9px] font-medium uppercase ${TYPE_INFO.chained.badge}`} title={TYPE_INFO.chained.title}>
            Chained
          </span>
          <p className="truncate text-sm font-medium">{data.label}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground" title="Automations dragged inside this group">
            {data.memberCount} inside
          </span>
          {/* step 237 — the eye: opens the full-space canvas with every member automation's own nodes
              fully expanded, so a new link can be drawn node-to-node instead of automation-to-automation. */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); data.onOpenDetail(id); }}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            title="Open this group — see every automation's own nodes on one screen and wire them node-to-node"
          >
            <Eye className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); data.onToggleLock(id); }}
            className={`rounded p-1 hover:bg-muted ${data.unlocked ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}
            title={data.unlocked
              ? "Unlocked — drag an automation in (or out), then it locks again in a few seconds. Click to lock now."
              : "Locked — click to unlock before dragging an automation in or out"}
          >
            {data.unlocked ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
          </button>
        </div>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const NODE_TYPES = { project: ProjectNode, chainGroup: ChainGroupNode };
// Default box size for a fresh group with no saved dimensions yet, and the estimated footprint of a plain
// project box — both feed the overlap-avoidance placement and the reparent position math.
const GROUP_DEFAULT = { width: 420, height: 280 };
const PROJECT_FOOTPRINT = { width: 220, height: 90 };

/** First free grid cell (280×160, 20px margin) that doesn't intersect any box already in `occupied`. */
function findFreeSlot(occupied: { x: number; y: number; w: number; h: number }[], w: number, h: number): { x: number; y: number } {
  const CELL_X = 280, CELL_Y = 160, MARGIN = 20;
  const overlapsAny = (x: number, y: number) =>
    occupied.some((o) => x < o.x + o.w + MARGIN && x + w + MARGIN > o.x && y < o.y + o.h + MARGIN && y + h + MARGIN > o.y);
  for (let row = 0; row < 200; row++) {
    for (let col = 0; col < 12; col++) {
      const x = col * CELL_X, y = row * CELL_Y;
      if (!overlapsAny(x, y)) return { x, y };
    }
  }
  return { x: 0, y: 0 };
}

/** Merge fresh polled project data into the EXISTING node array without ever touching position/parentId/size
 *  for an automation already on the canvas (that is local-authoritative once created — see the file-header
 *  comment on why). A brand-new automation gets its saved layout position, or a freshly computed free slot;
 *  `added` tells the caller whether anything new needs persisting. */
function mergeProjects(
  d: GState,
  current: AnyNode[],
  onToggleLock: (id: string) => void,
  onResize: (id: string, w: number, h: number) => void,
  onOpenDetail: (id: string) => void,
): { nodes: AnyNode[]; added: boolean } {
  const byId = new Map(current.map((n) => [n.id, n]));
  const occupied: { x: number; y: number; w: number; h: number }[] = [];
  for (const n of current) {
    if (n.parentId) continue; // nested children don't compete for top-level grid space
    const w = n.type === "chainGroup" ? Number(n.style?.width) || GROUP_DEFAULT.width : PROJECT_FOOTPRINT.width;
    const h = n.type === "chainGroup" ? Number(n.style?.height) || GROUP_DEFAULT.height : PROJECT_FOOTPRINT.height;
    occupied.push({ x: n.position.x, y: n.position.y, w, h });
  }
  let added = false;
  const result: AnyNode[] = [];

  for (const p of d.projects) {
    const existing = byId.get(p.automation);
    if (p.type === "chained") {
      if (existing && existing.type === "chainGroup") {
        result.push({ ...existing, data: { ...existing.data, label: p.slug, ready: p.ready } });
      } else {
        const entry = d.layout[p.automation];
        const width = entry?.width ?? GROUP_DEFAULT.width;
        const height = entry?.height ?? GROUP_DEFAULT.height;
        const pos = entry ? { x: entry.x, y: entry.y } : findFreeSlot(occupied, width, height);
        occupied.push({ x: pos.x, y: pos.y, w: width, h: height });
        added = true;
        result.push({
          id: p.automation, type: "chainGroup", position: pos, style: { width, height },
          data: { label: p.slug, ready: p.ready, unlocked: false, memberCount: 0, onToggleLock, onResize, onOpenDetail },
        });
      }
      continue;
    }
    if (existing && existing.type === "project") {
      result.push({
        ...existing,
        data: {
          ...existing.data, label: p.slug, ready: p.ready, type: p.type ?? "stream",
          sub: p.ready ? `${p.nodes} nodes · ready` : `in development · ${p.drafts} to build`,
        },
      });
    } else {
      const entry = d.layout[p.automation];
      const pos = entry ? { x: entry.x, y: entry.y } : findFreeSlot(occupied, PROJECT_FOOTPRINT.width, PROJECT_FOOTPRINT.height);
      occupied.push({ x: pos.x, y: pos.y, w: PROJECT_FOOTPRINT.width, h: PROJECT_FOOTPRINT.height });
      added = true;
      const node: PNode = {
        id: p.automation, type: "project", position: pos,
        data: {
          label: p.slug, ready: p.ready, type: p.type ?? "stream",
          sub: p.ready ? `${p.nodes} nodes · ready` : `in development · ${p.drafts} to build`,
        },
      };
      // A saved parent only counts for a BRAND NEW node, and only while that parent is still a live "chained"
      // automation (a stale reference — the group was deleted — degrades to a plain top-level node).
      if (entry?.parent && d.projects.some((g) => g.automation === entry.parent && g.type === "chained")) {
        node.parentId = entry.parent;
      }
      result.push(node);
    }
  }
  // React Flow requires parent nodes before their children in the array.
  result.sort((a, b) => Number(!!a.parentId) - Number(!!b.parentId));
  return { nodes: result, added };
}

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

// React Flow needs a ReactFlowProvider ANCESTOR for useReactFlow() (getIntersectingNodes/getNode/updateNode —
// used by the drag-into-group logic below) to work — the component that itself renders <ReactFlow> cannot
// call the hook directly. GlobalCanvas is now a thin provider wrapper; GlobalCanvasInner carries all the logic.
export function GlobalCanvas() {
  return (
    <ReactFlowProvider>
      <GlobalCanvasInner />
    </ReactFlowProvider>
  );
}

function GlobalCanvasInner() {
  const L = globalCanvasStrings(useUiLang());
  const [state, setState] = useState<GState | null>(null);
  // "Last selected" edge/project — deliberately NOT cleared to null on close (only `panelOpen` governs
  // visibility/animation, step 236.4) so the Sheet's slide-out animation has real content to animate away
  // instead of going blank the instant the owner clicks the close button.
  const [activeEdge, setActiveEdge] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState<"edge" | "project" | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<AnyNode>([]);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [quiz, setQuiz] = useState<QuizSubject | null>(null);
  // Bumped when a Quiz closes: the panels re-read the files the session just wrote (the link's spec.md).
  const [panelKey, setPanelKey] = useState(0);
  // GROUP LOCK STATE (step 234.3) — deliberately NOT persisted (owner's rule): a Set of currently-unlocked
  // group automations + a pending auto-relock timer per group, so unlock -> drag -> relock (5s, or an early
  // re-click of the same button, or simply a reload) all just work on plain client state. Mirrored onto the
  // node's own `data.unlocked` (via rf.updateNodeData) so the lock icon updates instantly, independent of
  // whatever else does or doesn't re-render.
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const lockTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // step 237 — the group the owner is currently viewing full-space (eye icon); null = the normal global
  // canvas. Deliberately NOT cleared on unrelated refetches — only the "Close automation" button clears it.
  const [detailGroup, setDetailGroup] = useState<string | null>(null);
  const openDetail = useCallback((id: string) => setDetailGroup(id), []);
  // Remembers each node's position at the moment its drag started, so a locked-group rejection can revert
  // to EXACTLY that value via rf.updateNode — see onNodeDragStart/onNodeDragStop below.
  const dragStartPositionRef = useRef<Record<string, { x: number; y: number }>>({});
  const rf = useReactFlow();

  const toggleLock = useCallback((automation: string) => {
    const isUnlocked = unlocked.has(automation);
    clearTimeout(lockTimers.current[automation]);
    delete lockTimers.current[automation];
    setUnlocked((prev) => {
      const next = new Set(prev);
      if (isUnlocked) next.delete(automation); else next.add(automation);
      return next;
    });
    rf.updateNodeData(automation, { unlocked: !isUnlocked });
    if (!isUnlocked) {
      lockTimers.current[automation] = setTimeout(() => {
        setUnlocked((p) => { const n = new Set(p); n.delete(automation); return n; });
        delete lockTimers.current[automation];
        rf.updateNodeData(automation, { unlocked: false });
      }, 5000);
    }
  }, [unlocked, rf]);

  useEffect(() => () => { Object.values(lockTimers.current).forEach(clearTimeout); }, []);

  const saveLayout = useCallback(async (layout: Record<string, LayoutEntry>) => {
    await fetch("/api/projects/global", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout }),
    });
  }, []);

  /** Derive the LayoutEntry map from an explicit node list (never re-read from the instance right after a
   *  mutation — zustand's own timing is not something to depend on; the caller always hands over the exact
   *  list it just computed, so persistence can never disagree with what was just applied visually). */
  const persistLayout = useCallback((list: AnyNode[]) => {
    const layout: Record<string, LayoutEntry> = {};
    for (const n of list) {
      const size = n.type === "chainGroup"
        ? { width: Number(n.style?.width) || GROUP_DEFAULT.width, height: Number(n.style?.height) || GROUP_DEFAULT.height }
        : {};
      layout[n.id] = { x: n.position.x, y: n.position.y, parent: n.parentId ?? null, ...size };
    }
    void saveLayout(layout);
  }, [saveLayout]);

  const resizeGroup = useCallback((id: string, w: number, h: number) => {
    rf.updateNode(id, { style: { width: w, height: h } });
    const list = (rf.getNodes() as AnyNode[]).map((x) => (x.id === id ? { ...x, style: { width: w, height: h } } : x));
    persistLayout(list);
  }, [rf, persistLayout]);

  const refetch = useCallback(async () => {
    const r = await fetch("/api/projects/global", { cache: "no-store" });
    if (!r.ok) return;
    const d = (await r.json()) as GState;
    setState(d);
    const current = rf.getNodes() as AnyNode[];
    const { nodes: merged, added } = mergeProjects(d, current, toggleLock, resizeGroup, openDetail);
    setNodes(merged);
    if (added) persistLayout(merged);
  }, [rf, toggleLock, resizeGroup, openDetail, persistLayout, setNodes]);

  useEffect(() => {
    void refetch();
    const t = setInterval(() => { if (document.visibilityState === "visible") void refetch(); }, 4000);
    return () => clearInterval(t);
  }, [refetch]);

  // LIVE GROUP-MEMBERSHIP COUNT — derived from the real node array (nodes.filter(parentId===groupId).length),
  // not from any polled field (there isn't one). Patches only the group nodes whose count actually changed,
  // and returns the SAME array reference when nothing changed so this bails out instead of looping.
  useEffect(() => {
    const counts = new Map<string, number>();
    for (const n of nodes) {
      if (n.parentId) counts.set(n.parentId, (counts.get(n.parentId) ?? 0) + 1);
    }
    setNodes((current) => {
      let changed = false;
      const next = current.map((n) => {
        if (n.type !== "chainGroup") return n;
        const count = counts.get(n.id) ?? 0;
        if (n.data.memberCount === count) return n;
        changed = true;
        return { ...n, data: { ...n.data, memberCount: count } };
      });
      return changed ? next : current;
    });
  }, [nodes, setNodes]);

  // Drawing a link → THE CONNECTION RULE (step 236.3): both endpoints must be inside the SAME group. Checked
  // client-side first, instant — no network round trip needed, `rf.getNode` reads the live node the drag/
  // reparent logic already maintains. The server (app/api/projects/edges/route.ts, sameGroup()) remains the
  // authority for races (e.g. two tabs); its 409 carries the SAME stable code this dictionary translates.
  const onConnect = useCallback(async (c: Connection) => {
    if (!c.source || !c.target || busy) return;
    const srcParent = rf.getNode(c.source)?.parentId;
    const tgtParent = rf.getNode(c.target)?.parentId;
    if (!srcParent || !tgtParent) {
      toast.error(L.linkCannotBeCreated, { description: L.errNotInGroup, duration: 15000 });
      return;
    }
    if (srcParent !== tgtParent) {
      toast.error(L.linkCannotBeCreated, { description: L.errDifferentGroups, duration: 15000 });
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
        const desc = d.error === "different_groups" ? L.errDifferentGroups
          : d.error === "not_in_group" ? L.errNotInGroup
          : d.error;
        toast.error(L.linkCannotBeCreated, { description: desc, duration: 15000 });
        return;
      }
      if (!r.ok) { toast.error(d.error ?? L.errCouldNotCreateLink); return; }
      toast.success(L.linkCreatedToast, { duration: 12000 });
      await refetch();
      if (d.edge) { setActiveEdge(d.edge.cuid); setPanelOpen("edge"); }
    } finally { setBusy(false); }
  }, [busy, refetch, rf, L]);

  const onNodeDragStart = useCallback((_: unknown, n: Node) => {
    dragStartPositionRef.current[n.id] = { x: n.position.x, y: n.position.y };
  }, []);

  // GROUP MEMBERSHIP via drag (rule 1 + 4). onNodesChange (wired on <ReactFlow> below, straight from
  // useNodesState) already gives LIVE visual dragging via applyNodeChanges — by the time this fires, `n`
  // already sits at the true drop position. Children are NOT given extent:'parent' (deliberately — that
  // would physically prevent the drag-OUT gesture the owner's symmetric removal case needs).
  const onNodeDragStop = useCallback((_: unknown, n: Node) => {
    if (n.type !== "project") {
      persistLayout(rf.getNodes() as AnyNode[]);
      return;
    }
    const currentParentId = n.parentId;
    const hitGroup = rf.getIntersectingNodes({ id: n.id }).find((o) => o.type === "chainGroup");

    if (hitGroup && hitGroup.id !== currentParentId) {
      if (!unlocked.has(hitGroup.id)) {
        toast.error(L.groupLockedTitle, { description: L.groupLockedDescIn, duration: 15000 });
        // EXPLICIT revert — without this the node stays visually wherever it was dropped (this is exactly
        // the bug the owner reported: nothing reverts on its own without onNodesChange-driven live state).
        rf.updateNode(n.id, { position: dragStartPositionRef.current[n.id] ?? n.position });
        return;
      }
      const oldParentNode = currentParentId ? rf.getNode(currentParentId) : undefined;
      const abs = oldParentNode
        ? { x: n.position.x + oldParentNode.position.x, y: n.position.y + oldParentNode.position.y }
        : { x: n.position.x, y: n.position.y };
      const rel = { x: abs.x - hitGroup.position.x, y: abs.y - hitGroup.position.y };
      rf.updateNode(n.id, { position: rel, parentId: hitGroup.id });
      const list = (rf.getNodes() as AnyNode[]).map((x) => (x.id === n.id ? { ...x, position: rel, parentId: hitGroup.id } : x));
      persistLayout(list);
      return;
    }
    if (!hitGroup && currentParentId) {
      if (!unlocked.has(currentParentId)) {
        toast.error(L.groupLockedTitle, { description: L.groupLockedDescOut, duration: 15000 });
        rf.updateNode(n.id, { position: dragStartPositionRef.current[n.id] ?? n.position });
        return;
      }
      const oldParentNode = rf.getNode(currentParentId);
      const abs = { x: n.position.x + (oldParentNode?.position.x ?? 0), y: n.position.y + (oldParentNode?.position.y ?? 0) };
      rf.updateNode(n.id, { position: abs, parentId: undefined });
      const list = (rf.getNodes() as AnyNode[]).map((x) => (x.id === n.id ? { ...x, position: abs, parentId: undefined } : x));
      persistLayout(list);
      return;
    }
    // Same group as before (or still top-level, no new group hit) — onNodesChange already applied the live
    // position; just persist what's now live.
    persistLayout(rf.getNodes() as AnyNode[]);
  }, [unlocked, rf, persistLayout, L]);

  const autoLayout = useCallback(() => {
    let i = 0;
    const next = (rf.getNodes() as AnyNode[]).map((n) => {
      if (n.parentId) return n; // nested children keep their saved relative position — never silently un-nested
      const position = { x: (i % 3) * 280, y: Math.floor(i / 3) * 160 };
      i++;
      return { ...n, position };
    });
    setNodes(next);
    persistLayout(next);
  }, [rf, setNodes, persistLayout]);

  const toggleGlobal = useCallback(async () => {
    if (!state) return;
    const next = state.status === "off" ? "on" : "off";
    await fetch("/api/projects/global", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    toast.info(
      next === "off" ? L.globalOffTitle : L.globalOnTitle,
      { description: next === "off" ? L.globalOffDesc : L.globalOnDesc, duration: 12000 },
    );
    await refetch();
  }, [state, refetch, L]);

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
        <h2 className="text-xl font-semibold">{L.title}</h2>
        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {L.loadingGraph}
        </p>
      </section>
    );
  }

  const edge = activeEdge ? state.edges.find((e) => e.cuid === activeEdge) : undefined;
  const project = activeProject ? state.projects.find((p) => p.automation === activeProject) : undefined;
  // Members of a selected GROUP (step 236.1 fix) — read from the live node array, never from any polled
  // field, so it can never disagree with what the owner actually sees on the canvas.
  const projectMembers = project?.type === "chained"
    ? nodes.filter((n) => n.parentId === project.automation).map((n) => ({ automation: n.id, slug: n.data.label }))
    : undefined;

  // step 237 — the group currently opened full-space (eye icon). Its own member list is derived the same
  // way projectMembers is above: from the live node array, never a polled field.
  const detailProject = detailGroup ? state.projects.find((p) => p.automation === detailGroup) : undefined;
  const detailMembers = detailGroup
    ? nodes.filter((n) => n.parentId === detailGroup).map((n) => ({ automation: n.id, slug: n.data.label }))
    : [];

  return (
    <section className="mt-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {detailProject ? (
          // step 237 — the general canvas' own header is replaced entirely: the group's name on the left,
          // "Close automation" on the right (the owner's exact spec) — nothing about the OTHER automations
          // is shown here, this screen belongs to this one group alone.
          <>
            <h2 className="text-xl font-semibold">{detailProject.slug}</h2>
            <Button variant="outline" size="sm" onClick={() => setDetailGroup(null)}>
              <X className="size-3.5" /> {L.btnCloseAutomation}
            </Button>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-semibold">{L.title}</h2>
              <p className="text-sm text-muted-foreground">
                {L.intro}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
                <span className={`size-2.5 rounded-full ${STATUS_PILL[state.status] ?? "bg-muted"}`} aria-hidden />
                {state.status === "in-development" ? L.statusInDevelopment : state.status === "on" ? L.statusOn : L.statusOff}
              </span>
              {/* A new automation is born FROM THE GLOBAL VIEW (step 225 G4) — the same single entry
                  POST /api/projects/create (never a second code path); the only difference from a category
                  grid's "+" card is that the canvas has no ambient category, so the modal asks for one. The
                  moment it exists, its Quiz opens here and the auto-quiz starts streaming. */}
              <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
                <Plus className="size-3.5" /> {L.btnAddAutomation}
              </Button>
              <Button variant="outline" size="sm" onClick={autoLayout}>
                <LayoutGrid className="size-3.5" /> {L.btnAutoLayout}
              </Button>
              <Button variant="outline" size="sm" onClick={toggleGlobal}>
                <Power className="size-3.5" /> {state.status === "off" ? L.btnTurnOn : L.btnTurnOff}
              </Button>
            </div>
          </>
        )}
      </div>

      {detailProject ? (
        // step 237 — the group's OWN members fully expanded, replacing the general canvas entirely while open.
        <GroupDetailCanvas members={detailMembers} edges={state.edges} onChanged={() => void refetch()} />
      ) : (
        // Canvas size (owner): 75% of the screen height; the width comes from its host section, which is the
        // standard 85vw column — so the canvas fills it exactly like every other block on the page.
        <div className="relative h-[75vh] w-full overflow-hidden rounded-lg border">
          <ReactFlow
            nodes={nodes}
            edges={rfEdges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onConnect={onConnect}
            onEdgeClick={(_, e) => { setActiveEdge(e.id); setPanelOpen("edge"); }}
            onNodeClick={(_, n) => { setActiveProject(n.id); setPanelOpen("project"); }}
            onNodeDragStart={onNodeDragStart}
            onNodeDragStop={onNodeDragStop}
            nodesConnectable
            deleteKeyCode={null}
            fitView
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      )}

      {/* ANIMATED SLIDE-IN PANELS (step 236.4) — Radix Sheet (components/ui/sheet.tsx), which already ships
          slide-in-from-right/slide-out-to-right. Rendered UNCONDITIONALLY (only `open` toggles) so Radix's own
          Presence drives the animation both ways — a parent-side conditional mount would skip the close
          animation entirely. `modal={false}` + `showOverlay={false}` together keep the canvas undimmed AND
          interactive behind the panel (today's behaviour, unchanged) — the shared Sheet's default is a dimmed
          modal overlay (still used as-is by account-drawer.client.tsx), so this pair of props is what opts
          THIS panel out of that default, additively. */}
      <Sheet open={panelOpen === "edge"} onOpenChange={(v) => { if (!v) setPanelOpen(null); }} modal={false}>
        <SheetContent side="right" showOverlay={false} className="w-96 max-w-[90vw] gap-3 overflow-y-auto p-4">
          <SheetHeader className="p-0">
            <SheetTitle className="flex items-center gap-1.5 text-sm font-medium">
              <CircleDot className="size-4" /> {L.sheetLinkTitle}
            </SheetTitle>
          </SheetHeader>
          {edge && (
            <GlobalEdgePanel
              key={`${edge.cuid}-${panelKey}`}
              edge={edge}
              onChanged={() => void refetch()}
              onDeleted={() => { setPanelOpen(null); void refetch(); }}
              onQuiz={() => setQuiz({ kind: "edge", cuid: edge.cuid, name: edge.name })}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* THE PROJECT PANEL (step 225 G4) — a click on a project node opens it. For a Chained group it shows
          its members + a chain brief instead of Open/Builder/Quiz (step 236.3 — a group has no workflow of
          its own to build). */}
      <Sheet open={panelOpen === "project"} onOpenChange={(v) => { if (!v) setPanelOpen(null); }} modal={false}>
        <SheetContent side="right" showOverlay={false} className="w-96 max-w-[90vw] gap-3 overflow-y-auto p-4">
          <SheetHeader className="p-0">
            <SheetTitle className="flex items-center gap-1.5 text-sm font-medium">
              <Boxes className="size-4" /> {L.sheetAutomationTitle}
            </SheetTitle>
          </SheetHeader>
          {project && (
            <GlobalProjectPanel
              key={`${project.automation}-${panelKey}`}
              project={project}
              members={projectMembers}
              onQuiz={() => setQuiz({ kind: "project", automation: project.automation, auto: false })}
            />
          )}
        </SheetContent>
      </Sheet>

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
