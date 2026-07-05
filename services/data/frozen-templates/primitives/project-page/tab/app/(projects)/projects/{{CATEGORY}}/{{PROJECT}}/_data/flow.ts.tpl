import type { Edge, Node } from "@xyflow/react";

// The process diagram as DATA. To shape the diagram for the real project,
// edit these nodes/edges — never the client component that renders them.
// Every node carries `info` — the payload of the on-canvas info panel:
// everything the node does must be readable there.
export type FlowNodeInfo = {
  summary: string;
  processes: string[];
};

export type FlowNodeData = {
  label: string;
  info: FlowNodeInfo;
};

export type FlowNode = Node<FlowNodeData, "process">;

export const FLOW_NODES: FlowNode[] = [
  {
    id: "trigger",
    type: "process",
    position: { x: 0, y: 120 },
    data: {
      label: "Trigger (cron / manual)",
      info: {
        summary:
          "Entry point of the automation: a scheduled cron event or a manual run from this page.",
        processes: [
          "Receives the run request",
          "Starts the pipeline with the run input",
        ],
      },
    },
  },
  {
    id: "work",
    type: "process",
    position: { x: 260, y: 120 },
    data: {
      label: {{PROJECT_TITLE}},
      info: {
        summary:
          "The main work of the project: turns the trigger input into the project's artifact.",
        processes: [
          "Reads the run input",
          "Executes the automation steps",
          "Hands the produced artifact downstream",
        ],
      },
    },
  },
  {
    id: "store",
    type: "process",
    position: { x: 520, y: 40 },
    data: {
      label: "Store result (DB / memory)",
      info: {
        summary:
          "Persists the run outcome so the tables on this page and the agents can read it.",
        processes: [
          "Writes the run record to the app DB",
          "Sends the result to vector memory when configured",
        ],
      },
    },
  },
  {
    id: "publish",
    type: "process",
    position: { x: 520, y: 200 },
    data: {
      label: "Publish artifact",
      info: {
        summary:
          "Makes the produced artifact reachable: a published page, a sent message or an exported file.",
        processes: [
          "Delivers the artifact to its destination",
          "Records the artifact link for the results table",
        ],
      },
    },
  },
];

export const FLOW_EDGES: Edge[] = [
  { id: "e-trigger-work", source: "trigger", target: "work", animated: true },
  { id: "e-work-store", source: "work", target: "store" },
  { id: "e-work-publish", source: "work", target: "publish", animated: true },
];
