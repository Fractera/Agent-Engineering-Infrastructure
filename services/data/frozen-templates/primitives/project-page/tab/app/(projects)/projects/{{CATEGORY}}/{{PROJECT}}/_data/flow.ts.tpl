import type { Node, Edge } from "@xyflow/react";

// The process diagram as DATA. To shape the diagram for the real project,
// edit these nodes/edges — never the client component that renders them.
export const FLOW_NODES: Node[] = [
  {
    id: "trigger",
    position: { x: 0, y: 120 },
    data: { label: "Trigger (cron / manual)" },
    type: "input",
  },
  {
    id: "work",
    position: { x: 260, y: 120 },
    data: { label: {{PROJECT_TITLE}} },
  },
  {
    id: "store",
    position: { x: 520, y: 40 },
    data: { label: "Store result (DB / memory)" },
  },
  {
    id: "publish",
    position: { x: 520, y: 200 },
    data: { label: "Publish artifact" },
    type: "output",
  },
];

export const FLOW_EDGES: Edge[] = [
  { id: "e-trigger-work", source: "trigger", target: "work", animated: true },
  { id: "e-work-store", source: "work", target: "store" },
  { id: "e-work-publish", source: "work", target: "publish", animated: true },
];
