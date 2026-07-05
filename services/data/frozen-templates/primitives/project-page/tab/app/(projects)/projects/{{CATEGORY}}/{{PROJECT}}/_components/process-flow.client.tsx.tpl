"use client";

import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useNodesState,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Info, X } from "lucide-react";
import { useMemo, useState } from "react";
import { FLOW_EDGES, FLOW_NODES, type FlowNode } from "../_data/flow";

// Interactive process diagram (react-flow). Its shape is DATA in _data/flow.ts —
// reshape the diagram there, never in this component. Nodes are movable and
// edges follow them, but the canvas cannot create or delete anything: the data
// file stays the single source of truth of the diagram.
function ProcessNode({ data, selected }: NodeProps<FlowNode>) {
  return (
    <div
      className={
        "flex max-w-56 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm " +
        (selected ? "border-primary" : "border-border")
      }
    >
      <Handle type="target" position={Position.Left} />
      <span>{data.label}</span>
      <Info className="size-3.5 shrink-0 text-muted-foreground" />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const NODE_TYPES = { process: ProcessNode };

export function ProcessFlow() {
  const [nodes, , onNodesChange] = useNodesState<FlowNode>(FLOW_NODES);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = activeId
    ? nodes.find((node) => node.id === activeId)
    : undefined;

  // The node's connections, derived from the edges — shown in the info panel.
  const links = useMemo(() => {
    if (!activeId) {
      return { incoming: [], outgoing: [] };
    }
    const labelOf = (id: string) =>
      nodes.find((node) => node.id === id)?.data.label ?? id;
    return {
      incoming: FLOW_EDGES.filter((edge) => edge.target === activeId).map(
        (edge) => labelOf(edge.source)
      ),
      outgoing: FLOW_EDGES.filter((edge) => edge.source === activeId).map(
        (edge) => labelOf(edge.target)
      ),
    };
  }, [activeId, nodes]);

  return (
    <div className="relative h-[420px] overflow-hidden rounded-lg border">
      <ReactFlow
        nodes={nodes}
        edges={FLOW_EDGES}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => setActiveId(node.id)}
        onPaneClick={() => setActiveId(null)}
        nodesConnectable={false}
        deleteKeyCode={null}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
      {active && (
        <aside className="absolute inset-y-0 right-0 w-64 space-y-4 overflow-y-auto border-l bg-background/95 p-4 text-sm">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium">{active.data.label}</h3>
            <button
              type="button"
              aria-label="Close node info"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setActiveId(null)}
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="text-muted-foreground">{active.data.info.summary}</p>
          {active.data.info.processes.length > 0 && (
            <div className="space-y-1">
              <h4 className="font-medium">Processes</h4>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {active.data.info.processes.map((process) => (
                  <li key={process}>{process}</li>
                ))}
              </ul>
            </div>
          )}
          {(links.incoming.length > 0 || links.outgoing.length > 0) && (
            <div className="space-y-1">
              <h4 className="font-medium">Connections</h4>
              <ul className="space-y-1 text-muted-foreground">
                {links.incoming.map((label) => (
                  <li key={`in-${label}`}>← {label}</li>
                ))}
                {links.outgoing.map((label) => (
                  <li key={`out-${label}`}>→ {label}</li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
