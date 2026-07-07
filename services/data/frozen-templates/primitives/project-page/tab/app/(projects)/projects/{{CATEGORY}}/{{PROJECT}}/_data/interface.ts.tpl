// fractera:interface default — the STARTER's placeholder I/O boundary (ontology entity 14 Port,
// §E). A DECOMPOSED project REPLACES this file: the engine rewrites it from the graph's
// interface{inputs,outputs} (marker above, same contract as _data/actions.ts / columns.ts — a
// re-run overwrites it). The project page header renders Inputs → Outputs from PROJECT_INTERFACE.
// Canon: CRUD-DOCS/workspace-standards/automation-ontology.md.

export type PortType = "channel" | "page" | "store" | "schedule" | "event" | "manual" | "external-api";

export type ProjectPort = {
  type: PortType;
  endpoint: string; // the concrete source (input) or destination (output)
  surface: string; // personal | site | external
  cardinality: "one" | "many";
  external: boolean; // crosses the server boundary (needs a third-party credential)
  autonomous: boolean; // an output that outlives the run (a standing page/surface)
  format: string; // text | record | page-content | media | event
};

export type ProjectInterface = { inputs: ProjectPort[]; outputs: ProjectPort[] };

// Starter default: a personal automation — a manual run in, a durable record out. A decomposed
// project overwrites this with its real declared boundary.
export const PROJECT_INTERFACE: ProjectInterface = {
  inputs: [
    { type: "manual", endpoint: "run panel", surface: "personal", cardinality: "one", external: false, autonomous: false, format: "text" },
  ],
  outputs: [
    { type: "store", endpoint: "", surface: "personal", cardinality: "one", external: false, autonomous: false, format: "record" },
  ],
};
