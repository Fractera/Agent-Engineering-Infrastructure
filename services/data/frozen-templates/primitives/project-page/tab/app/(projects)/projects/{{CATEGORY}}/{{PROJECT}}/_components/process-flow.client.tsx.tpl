"use client";

import { ReactFlow, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FLOW_NODES, FLOW_EDGES } from "../_data/flow";

// Interactive process diagram (react-flow). Its shape is DATA in _data/flow.ts —
// reshape the diagram there, never in this component.
export function ProcessFlow() {
  return (
    <div className="h-[420px] rounded-lg border">
      <ReactFlow nodes={FLOW_NODES} edges={FLOW_EDGES} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
