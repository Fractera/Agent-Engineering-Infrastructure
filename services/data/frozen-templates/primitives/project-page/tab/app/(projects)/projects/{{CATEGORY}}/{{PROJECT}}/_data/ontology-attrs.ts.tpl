// The shared ONTOLOGY-ATTRIBUTE vocabulary (automation ontology, canon
// CRUD-DOCS/workspace-standards/automation-ontology.md). ONE map id → { label, tooltip },
// reused by THREE surfaces so no text is authored twice:
//   1. the diagram node card — the typed-facet badges (kind + action + condition + channel),
//   2. the records table's column picker — each checkbox is labelled by its ontology entity,
//   3. the node info panel headings.
// Kept in English by design (the react-flow canvas and admin settings are English — same
// contract as _data/tab-i18n.ts). A node/column carries an attribute id; the UI looks the
// label + tooltip up here.

export type OntologyAttrId =
  | "trigger"
  | "router"
  | "step"
  | "transform"
  | "action"
  | "hook"
  | "condition"
  | "channel"
  | "state"
  | "integration";

export type OntologyAttr = { label: string; tooltip: string };

export const ONTOLOGY_ATTRS: Record<OntologyAttrId, OntologyAttr> = {
  trigger: {
    label: "Trigger",
    tooltip: "The event that starts a run — a message, a schedule, a manual run or a webhook.",
  },
  router: {
    label: "Router",
    tooltip: "The classifier step that turns an incoming event into one action (or ignores it).",
  },
  step: {
    label: "Step",
    tooltip: "An atomic operation — call an API, transform data, write a row.",
  },
  transform: {
    label: "Transform",
    tooltip: "A pure data-reshaping step, with no external effect.",
  },
  action: {
    label: "Action",
    tooltip: "A named outcome of the automation — a branch of steps bound to hook phrases.",
  },
  hook: {
    label: "Hook",
    tooltip: "A spoken phrase bound to one action — how a person drives the automation by voice.",
  },
  condition: {
    label: "Condition",
    tooltip: "A declared guard — the step runs only if this holds; shown on the diagram and per record.",
  },
  channel: {
    label: "Channel",
    tooltip: "Where an action's output is delivered — for example the bot chat.",
  },
  state: {
    label: "State",
    tooltip: "Data the automation keeps between runs — a poll cursor, the vector memory.",
  },
  integration: {
    label: "Integration",
    tooltip: "An external service and its keys — declared, never hardcoded.",
  },
};

// Lookup — an unknown id degrades to its own text with no tooltip (never throws).
export function ontologyAttr(id: string): OntologyAttr {
  return (ONTOLOGY_ATTRS as Record<string, OntologyAttr>)[id] ?? { label: id, tooltip: "" };
}
