"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NodeContract } from "../node-contract";
import { DiagramPanel, NodeCard } from "./diagram-panel.client";

// FROZEN STANDARD (step 223.C) — the diagram CANVAS: the Master's nodes as a graph (react-flow). Click a
// node → its full contract opens in the side panel. The ACTIVE-NODE HIGHLIGHT (step 223.C.3): the canvas
// polls the automation's active run (/api/projects/runs/active) and frames the node whose run status is
// "running" with a BOLD ORANGE frame (finished nodes tint green, failed red). The highlight is DB-backed
// (the run's current_node), so it is deterministic and survives a reload — not a client flag. A
// "Simulate" button steps a run through the nodes so the highlight is visible before real execution
// exists (real execution is 223.C.6; it replaces the simulate trigger with the node functions running).
type RunStatus = "idle" | "running" | "ok" | "fail";
type CanvasNodeData = { label: string; run: NodeContract["run"]; runStatus: RunStatus };
type CanvasNode = Node<CanvasNodeData, "diagram">;

const RUN_FRAME: Record<RunStatus, string> = {
  running: "border-2 border-orange-500 ring-2 ring-orange-500/40",
  ok: "border-emerald-500",
  fail: "border-rose-500",
  idle: "border-border",
};

function DiagramNode({ data, selected }: NodeProps<CanvasNode>) {
  const frame = data.runStatus !== "idle" ? RUN_FRAME[data.runStatus] : selected ? "border-primary ring-1 ring-primary" : "border-border";
  return (
    <div className={`w-48 rounded-md border bg-background px-3 py-2 text-sm shadow-sm ${frame}`}>
      <Handle type="target" position={Position.Left} />
      <p className="truncate font-medium">{data.label}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {data.runStatus === "running" ? "● running" : data.run}
      </p>
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
  const nodeIds = useMemo(() => nodes.map((n) => n.id), [nodes]);

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
    } catch {
      /* leave as-is */
    }
  }, [automation]);

  // Poll the active run so the highlight reflects the DB (also picks up runs driven elsewhere).
  useEffect(() => {
    if (!automation) return;
    void refetchActive();
    const t = setInterval(() => void refetchActive(), 1500);
    return () => clearInterval(t);
  }, [automation, refetchActive]);

  const simulate = useCallback(async () => {
    if (!automation || simulating) return;
    setSimulating(true);
    try {
      // start + advance until the run finishes (bounded by the node count).
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
  }, [automation, nodeIds, refetchActive, simulating]);

  const rfNodes = useMemo<CanvasNode[]>(
    () =>
      nodes.map((n, i) => ({
        id: n.id,
        type: "diagram",
        position: { x: i * 240, y: 0 },
        data: { label: n.name, run: n.run, runStatus: runStatus[n.id] ?? "idle" },
      })),
    [nodes, runStatus],
  );
  const rfEdges = useMemo<Edge[]>(
    () => nodes.slice(1).map((n, i) => ({ id: `${nodes[i].id}->${n.id}`, source: nodes[i].id, target: n.id })),
    [nodes],
  );

  const active = activeId ? nodes.find((n) => n.id === activeId) : undefined;

  if (!nodes.length) return <DiagramPanel nodes={[]} />;

  return (
    <div className="space-y-2">
      {automation && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {currentNode ? (
              <span className="text-orange-600 dark:text-orange-400">● running: {currentNode}</span>
            ) : (
              "Not running"
            )}
          </p>
          <Button variant="outline" size="sm" onClick={simulate} disabled={simulating}>
            <Play className="size-3.5" />
            {simulating ? "Simulating…" : "Simulate run"}
          </Button>
        </div>
      )}
      <div className="relative h-[80vh] w-full overflow-hidden rounded-lg border">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={NODE_TYPES}
          onNodeClick={(_, node) => setActiveId(node.id)}
          onPaneClick={() => setActiveId(null)}
          nodesConnectable={false}
          nodesDraggable={false}
          deleteKeyCode={null}
          fitView
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
        {active && (
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
            <NodeCard node={active} />
          </aside>
        )}
      </div>
    </div>
  );
}
