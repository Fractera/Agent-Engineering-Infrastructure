"use client";

import { useMemo, useState } from "react";
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
import { X } from "lucide-react";
import type { NodeContract } from "../node-contract";
import { DiagramPanel, NodeCard } from "./diagram-panel.client";

// FROZEN STANDARD (step 223.C, "the canvas") — the diagram CANVAS: the Master's nodes laid out as a
// graph (react-flow). Click a node → its full contract opens in the side panel on the right (name /
// description / typed I/O + the "Instruction" accordion + one card per function, incl. the FULL system
// instruction of any external-AI function) — the same NodeCard the flat panel uses. The Master here is
// an ordered list with no explicit edges yet, so the canvas draws a linear chain in array order
// (node[i] → node[i+1]); explicit branching edges are a later addition to the contract. The active-node
// orange highlight (driven by a run's current_node) is the next slice — the canvas is its prerequisite.
type CanvasNodeData = { label: string; run: NodeContract["run"] };
type CanvasNode = Node<CanvasNodeData, "diagram">;

function DiagramNode({ data, selected }: NodeProps<CanvasNode>) {
  return (
    <div
      className={
        "w-48 rounded-md border bg-background px-3 py-2 text-sm shadow-sm " +
        (selected ? "border-primary ring-1 ring-primary" : "border-border")
      }
    >
      <Handle type="target" position={Position.Left} />
      <p className="truncate font-medium">{data.label}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{data.run}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const NODE_TYPES = { diagram: DiagramNode };

export function DiagramCanvas({ nodes }: { nodes: NodeContract[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const rfNodes = useMemo<CanvasNode[]>(
    () =>
      nodes.map((n, i) => ({
        id: n.id,
        type: "diagram",
        position: { x: i * 240, y: 0 },
        data: { label: n.name, run: n.run },
      })),
    [nodes],
  );
  const rfEdges = useMemo<Edge[]>(
    () =>
      nodes.slice(1).map((n, i) => ({
        id: `${nodes[i].id}->${n.id}`,
        source: nodes[i].id,
        target: n.id,
      })),
    [nodes],
  );

  const active = activeId ? nodes.find((n) => n.id === activeId) : undefined;

  // No nodes yet → the honest empty state (reuse the flat panel's message).
  if (!nodes.length) return <DiagramPanel nodes={[]} />;

  return (
    <div className="relative h-[440px] overflow-hidden rounded-lg border">
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
  );
}
