import type { Edge, Node } from "@xyflow/react";

// The process diagram as DATA — and, under the projects-mode contract (R6), the
// EXECUTION SCHEMA of the project: what is not on this diagram does not exist
// in the project. To shape the diagram for the real project, edit these
// nodes/edges — never the client component that renders them. When the project
// is born from a decomposition (orchestrate-project-by-steps), this file is
// GENERATED from the graph — extend the GRAPH and re-run the engine instead of
// hand-editing. Every node carries `info` — the payload of the on-canvas info
// panel: everything the node does must be readable there (kind, actions,
// condition, task, tools, env keys, inputs/outputs, processes). `info.actions`
// names the Action branches flowing through the node ("all" = trunk) and drives
// the node's color — the automation ontology (step 188-R; canon:
// CRUD-DOCS/workspace-standards/automation-ontology.md).
export type FlowNodeInfo = {
  summary: string;
  processes: string[];
  kind: "trigger" | "router" | "step" | "transform" | "action" | "event";
  actions?: string[] | "all";
  condition?: string | null;
  subscribes?: string[]; // inter-automation event trigger — the events it subscribes to (§D, step 195)
  task?: string;
  tools: string[];
  envKeys: string[];
  io?: { in: unknown; out: unknown };
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
        kind: "trigger",
        tools: [],
        envKeys: [],
        io: { in: "run input (optional)", out: "started run" },
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
        kind: "action",
        tools: [],
        envKeys: [],
        io: { in: "run input", out: "produced artifact" },
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
        kind: "action",
        tools: [],
        envKeys: [],
        io: { in: "produced artifact", out: "stored run record" },
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
        kind: "action",
        tools: [],
        envKeys: [],
        io: { in: "produced artifact", out: "artifact link" },
      },
    },
  },
];

export const FLOW_EDGES: Edge[] = [
  { id: "e-trigger-work", source: "trigger", target: "work", animated: true },
  { id: "e-work-store", source: "work", target: "store" },
  { id: "e-work-publish", source: "work", target: "publish", animated: true },
];
