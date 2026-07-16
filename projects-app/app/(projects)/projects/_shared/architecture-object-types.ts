// THE ARCHITECTURE OBJECT'S TYPING, AS TEXT (owner 2026-07-16) — shown/copied in the "How it works" modal
// next to the collected JSON. Two audiences: the OWNER verifies the object's structure while it is being
// developed, and a CODING AGENT that receives the JSON alongside this typing understands the architecture's
// shape and cannot break it when writing an updated object. This is a HAND-MAINTAINED mirror of the real
// types in lib/entity-architecture.ts + lib/entity-store.ts + _shared/table-config.ts — when those change,
// update this string in the same commit (grep anchor: ARCHITECTURE_OBJECT_TYPES).
export const ARCHITECTURE_OBJECT_TYPES = `// The architecture object (JSON1 full / JSON2 snapshot) — TypeScript typing
type ArchitectureBundle = {
  automation: string;                       // "<category>/<slug>"
  format: "full-with-history" | "current-snapshot";
  agent_instruction: string;                // the reading agent's duties over this whole object (static law)
  generatedAt: string;                      // ISO timestamp
  passport: Passport;                       // what this automation IS
  diagram: DiagramObject;                   // nodes + edges — the ONLY source of behaviour
  entities: EntitySlice[];                  // every other entity, one uniform shape
};

type Passport = {
  automation: string; title: string; description: string;
  type: "stream" | "instanced" | "chained";
  available_types_and_descriptions: Record<string, string>;
  isChainedGroup: boolean;
  ownerInstruction: string;                 // the owner's original free-form instruction
  rawRequest: string;                       // always "" at passport level (wishes ride the entities)
  summary: string;                          // the owner-validated "How it works" text
  howItWorks: string; howItWorksUpdatedAt: string | null;
  readme: string;
  entityToggles: Record<string, boolean>;
};

type DiagramObject = {
  instruction: string;                      // the node-building methodology + the 25/30 node budget
  rawRequest: string; summary: string;
  nodes: NodeSlice;
  edges: { instruction: string; instances: DiagramEdge[] };
};

type NodeSlice = {
  entityType: "node";
  instruction: string;                      // how ANY node is built (identical for every role)
  available_node_roles_and_descriptions: Record<string, string>;
  custom_roles_allowed: boolean;
  role_groups: {                            // the automation's shape, grouped by role
    role: string;                           // "input" | "intermediate" | "output" | custom
    system_instruction: string;
    available_types?: Record<string, string>; // input/output channels; intermediate: transform | condition
    nodes: { ref: string; name: string; ioType?: string }[];
  }[];
  instances: NodeInstance[];
};

type NodeInstance = EntityInstance & {
  identity: { cuid: string; slug: string; name: string; status: string; draft: boolean; role: string; ioType?: string };
  functions: {                              // the deterministic code living INSIDE this node
    name: string; instruction: string;
    takes: Record<string, string>; returns: string;
  }[];
};

type DiagramEdge = {
  from: string; to: string;                 // node cuids (look them up in nodes.instances)
  fromName: string; toName: string;
  when: string | null;                      // null = always taken; text = the condition gating this edge
  rawRequest: string; summary: string;
};

// EVERY entity instance carries the universal pair:
type EntityInstance = {
  ref: string;                              // "" = automation-wide; a cuid; or a dashboard TABLE id
  identity: unknown;                        // descriptive facts (entity-specific)
  rawRequest: string;                       // the owner's free-form wish; non-empty = pending development
  summary: string;                          // the AI's compact "how it works now" (<=300 chars, owner's language)
  pending: boolean;                         // always === (currentTask !== null)
  currentTask: unknown | null;              // the flat task shape (1-3 string fields)
  history: { version: number; task: unknown; devStepRef: string | null; createdAt: string }[];
};

type EntitySlice = {
  entityType: "edge" | "usecase" | "chain" | "dashboard" | "analytics" | "calendar" | "cron" | "map" | "processes";
  instruction?: string;                     // this entity type's own static law ("" = none yet)
  instances: EntityInstance[];
  error?: string;
  // dashboard slice only:
  available_column_types?: Record<string, string>;   // the closed set of table column kinds
  available_action_types?: Record<string, string>;   // what a cell action (modal) can be
};

// A dashboard TABLE instance's identity (ref = the table id):
type DashboardTableIdentity = {
  tableId: string; title: string; description?: string;
  columns: {
    id: string; header: string;
    type: "badge" | "text" | "longtext" | "number" | "date" | "link" | "image" | "actions";
    source: string;                         // the key in a row's values this column reads
    action?: "detail" | "delete" | "live";  // a cell action that opens a modal
    actionDescription?: string;             // plain-language: what that modal does (author it with the action)
    suffix?: string; liveUrl?: string;
  }[];
  rowStore: string;                         // the ONE shared row store output nodes write through
};`;
