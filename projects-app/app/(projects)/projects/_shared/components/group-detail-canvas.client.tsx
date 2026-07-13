"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background, Controls, Handle, Position, ReactFlow,
  type Connection, type Edge, type Node, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CircleDot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { GlobalEdgePanel } from "./global-edge-panel.client";
import { useUiLang } from "../use-ui-lang";
import { globalCanvasStrings } from "../global-canvas-i18n";

// THE GROUP DETAIL CANVAS (step 237) — the eye icon on a Chained group opens this: the global canvas
// disappears and this one takes the full space instead. Every member automation's OWN nodes render fully
// expanded (the same nodes DiagramCanvas shows on that automation's own page), each set boxed in its own
// tinted background so automations never visually blend into each other. Because the real nodes are on
// screen, a new link is drawn NODE-TO-NODE by a plain drag between two handles — the owner never has to
// answer "which node feeds which" a second time in a picker (GlobalEdgePanel's `nodesLocked`, step 237).
//
// Read-only layout by design (v1, owner did not ask for drag-to-rearrange here): each automation's nodes
// are placed by the SAME depth/sibling tree layout DiagramCanvas computes for its own Builder canvas, then
// the automations are laid out left to right. `nodesDraggable={false}` on <ReactFlow> means the plain
// controlled `nodes` array below is safe WITHOUT useNodesState/onNodesChange — the trap documented at
// length in global-canvas.client.tsx's header only exists when nodes CAN be dragged.
type IndexNode = {
  cuid: string; slug: string; name: string; parent_cuid: string | null;
  x: number | null; y: number | null; draft: number; active_version: number; status: string;
};
export type GEdge = {
  cuid: string; from_automation: string; to_automation: string; name: string; draft: number;
  active_version: number; from_node_cuid: string | null; to_node_cuid: string | null;
};
export type GroupDetailMember = { automation: string; slug: string };

type MemberData = { label: string; sub: string; draft: boolean };
type MemberNode = Node<MemberData, "memberNode">;
type BgData = { label: string; colorClass: string };
type BgNode = Node<BgData, "groupBg">;
type DetailNode = MemberNode | BgNode;

function MemberNodeView({ data }: NodeProps<MemberNode>) {
  const frame = data.draft ? "border-2 border-rose-500 border-dashed" : "border-border";
  return (
    <div className={`w-44 rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-sm ${frame}`}>
      <Handle type="target" position={Position.Left} />
      <p className="truncate font-medium">{data.label}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{data.sub}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function GroupBgNodeView({ data }: NodeProps<BgNode>) {
  return (
    <div className={`h-full w-full rounded-lg border-2 ${data.colorClass}`}>
      <div className="truncate rounded-t-[7px] border-b bg-background/80 px-2 py-1.5 text-xs font-medium">
        {data.label}
      </div>
    </div>
  );
}

const NODE_TYPES = { memberNode: MemberNodeView, groupBg: GroupBgNodeView };

// Cycles so an arbitrary number of member automations still get a visually distinct background.
const PALETTE = [
  "border-sky-500/50 bg-sky-500/5",
  "border-violet-500/50 bg-violet-500/5",
  "border-amber-500/50 bg-amber-500/5",
  "border-emerald-500/50 bg-emerald-500/5",
  "border-rose-500/50 bg-rose-500/5",
  "border-cyan-500/50 bg-cyan-500/5",
  "border-indigo-500/50 bg-indigo-500/5",
  "border-lime-500/50 bg-lime-500/5",
];

const COL_W = 240, ROW_H = 100, HEADER_H = 36, PAD = 20, GAP_X = 80;

/** Same depth/sibling tree layout DiagramCanvas uses for one automation's own Builder canvas — a root
 *  takes the next column in the root chain, a child takes its parent's column + 1, siblings stack rows. */
function treeLayout(nodes: IndexNode[]): { pos: Map<string, { x: number; y: number }>; cols: number; rows: number } {
  const byCuid = new Map(nodes.map((n) => [n.cuid, n]));
  const isRoot = (n: IndexNode) => !n.parent_cuid || !byCuid.has(n.parent_cuid);
  const rootCol = new Map<string, number>();
  nodes.filter(isRoot).forEach((n, i) => rootCol.set(n.cuid, i));
  const colOf = new Map<string, number>();
  const column = (cuid: string, guard = 0): number => {
    if (colOf.has(cuid)) return colOf.get(cuid) as number;
    const n = byCuid.get(cuid);
    const c = !n || isRoot(n) || guard > 50 ? (rootCol.get(cuid) ?? 0) : column(n.parent_cuid as string, guard + 1) + 1;
    colOf.set(cuid, c);
    return c;
  };
  const rowsUsed = new Map<number, number>();
  const pos = new Map<string, { x: number; y: number }>();
  let maxCol = 0, maxRow = 0;
  for (const n of nodes) {
    const col = column(n.cuid);
    const row = rowsUsed.get(col) ?? 0;
    rowsUsed.set(col, row + 1);
    pos.set(n.cuid, { x: col * COL_W, y: row * ROW_H });
    maxCol = Math.max(maxCol, col);
    maxRow = Math.max(maxRow, row);
  }
  return { pos, cols: maxCol + 1, rows: maxRow + 1 };
}

export function GroupDetailCanvas({
  members, edges, onChanged,
}: { members: GroupDetailMember[]; edges: GEdge[]; onChanged: () => void }) {
  const L = globalCanvasStrings(useUiLang());
  const [byAutomation, setByAutomation] = useState<Record<string, IndexNode[]>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeEdge, setActiveEdge] = useState<GEdge | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const entries = await Promise.all(members.map(async (m) => {
        const r = await fetch(`/api/projects/nodes?automation=${encodeURIComponent(m.automation)}`, { cache: "no-store" });
        const d = r.ok ? ((await r.json()) as { nodes: IndexNode[] }) : { nodes: [] };
        return [m.automation, d.nodes ?? []] as const;
      }));
      if (cancelled) return;
      setByAutomation(Object.fromEntries(entries));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [members]);

  const { nodes, memberEdges } = useMemo(() => {
    let originX = 0;
    const bgNodes: DetailNode[] = [];
    const memberNodes: DetailNode[] = [];
    const intraEdges: Edge[] = [];
    members.forEach((m, i) => {
      const idx = byAutomation[m.automation] ?? [];
      const { pos, cols, rows } = treeLayout(idx);
      const width = Math.max(cols * COL_W + PAD, 260);
      const height = Math.max(rows * ROW_H + HEADER_H + PAD, 140);
      const bgId = `bg::${m.automation}`;
      bgNodes.push({
        id: bgId, type: "groupBg", position: { x: originX, y: 0 }, style: { width, height },
        selectable: false, draggable: false,
        data: { label: m.slug, colorClass: PALETTE[i % PALETTE.length] },
      });
      const byCuid = new Map(idx.map((n) => [n.cuid, n]));
      for (const n of idx) {
        const p = pos.get(n.cuid) ?? { x: 0, y: 0 };
        memberNodes.push({
          id: `${m.automation}::${n.cuid}`, type: "memberNode", parentId: bgId, draggable: false,
          position: { x: p.x + PAD / 2, y: p.y + HEADER_H + PAD / 2 },
          data: { label: n.name, sub: n.draft ? "draft" : `v${n.active_version}`, draft: n.draft === 1 },
        });
        if (n.parent_cuid && byCuid.has(n.parent_cuid)) {
          intraEdges.push({
            id: `${m.automation}::${n.parent_cuid}->${m.automation}::${n.cuid}`,
            source: `${m.automation}::${n.parent_cuid}`, target: `${m.automation}::${n.cuid}`,
            style: { strokeWidth: 1, opacity: 0.5 },
          });
        }
      }
      originX += width + GAP_X;
    });
    return { nodes: [...bgNodes, ...memberNodes], memberEdges: intraEdges };
  }, [members, byAutomation]);

  const crossEdges = useMemo<Edge[]>(() => {
    const memberSet = new Set(members.map((m) => m.automation));
    return edges
      .filter((e) => memberSet.has(e.from_automation) && memberSet.has(e.to_automation) && e.from_node_cuid && e.to_node_cuid)
      .map((e) => ({
        id: e.cuid,
        source: `${e.from_automation}::${e.from_node_cuid}`,
        target: `${e.to_automation}::${e.to_node_cuid}`,
        label: e.draft ? `${e.name} (draft)` : `${e.name} v${e.active_version}`,
        animated: e.draft === 1,
        style: e.draft ? { stroke: "#f43f5e", strokeDasharray: "6 4", strokeWidth: 2 } : { stroke: "#6366f1", strokeWidth: 2 },
      }));
  }, [edges, members]);

  // NODE-TO-NODE CONNECT (step 237) — the whole point of this canvas: the drag itself already says which
  // node feeds which, so the edge is created with fromNodeCuid/toNodeCuid FILLED from the very start
  // (the create-edge route already accepted these — see app/api/projects/edges/route.ts).
  const onConnect = useCallback(async (c: Connection) => {
    if (!c.source || !c.target || busy) return;
    const [autoA, cuidA] = c.source.split("::");
    const [autoB, cuidB] = c.target.split("::");
    if (!autoA || !cuidA || !autoB || !cuidB || autoA === autoB) {
      toast.error(L.linkCannotBeCreated, { description: L.errSameAutomationLink, duration: 12000 });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/projects/edges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: autoA, to: autoB, fromNodeCuid: cuidA, toNodeCuid: cuidB }),
      });
      const d = (await r.json()) as { ok?: boolean; error?: string; edge?: GEdge };
      if (!r.ok) { toast.error(d.error ?? L.errCouldNotCreateLink); return; }
      toast.success(L.linkCreatedToast, { duration: 10000 });
      onChanged();
      if (d.edge) { setActiveEdge(d.edge); setPanelOpen(true); }
    } finally { setBusy(false); }
  }, [busy, L, onChanged]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> {L.loadingGraph}
      </p>
    );
  }
  if (!members.length) {
    return <p className="text-sm text-muted-foreground">{L.groupMembersEmpty}</p>;
  }

  return (
    <>
      <div className="relative h-[75vh] w-full overflow-hidden rounded-lg border">
        <ReactFlow
          nodes={nodes}
          edges={[...memberEdges, ...crossEdges]}
          nodeTypes={NODE_TYPES}
          onConnect={onConnect}
          onEdgeClick={(_, e) => {
            const found = edges.find((x) => x.cuid === e.id);
            if (found) { setActiveEdge(found); setPanelOpen(true); }
          }}
          nodesDraggable={false}
          nodesConnectable
          deleteKeyCode={null}
          fitView
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <Sheet open={panelOpen} onOpenChange={(v) => { if (!v) setPanelOpen(false); }} modal={false}>
        <SheetContent side="right" showOverlay={false} className="w-96 max-w-[90vw] gap-3 overflow-y-auto p-4">
          <SheetHeader className="p-0">
            <SheetTitle className="flex items-center gap-1.5 text-sm font-medium">
              <CircleDot className="size-4" /> {L.sheetLinkTitle}
            </SheetTitle>
          </SheetHeader>
          {activeEdge && (
            <GlobalEdgePanel
              key={activeEdge.cuid}
              edge={activeEdge}
              nodesLocked
              onChanged={onChanged}
              onDeleted={() => { setPanelOpen(false); onChanged(); }}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
