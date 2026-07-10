// fractera:interface os-629d27a2ddcfd5e5 — the automation's typed I/O boundary (ontology entity
// 14 Port, §E). GENERATED from the graph's interface{inputs,outputs}; a re-run overwrites this
// file (same contract as _data/actions.ts / columns.ts). The project page header renders
// Inputs → Outputs from PROJECT_INTERFACE. Canon: CRUD-DOCS/workspace-standards/automation-ontology.md.

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

// telegram-notes: a personal messaging automation — messaging in (+ a reminder timer),
// messaging out + a durable record. No page, no external-api (nothing autonomous, nothing external).
export const PROJECT_INTERFACE: ProjectInterface = {
  inputs: [
    { type: "channel", endpoint: "telegram-bot-chat", surface: "personal", cardinality: "one", external: false, autonomous: false, format: "text" },
    { type: "schedule", endpoint: "reminder cron", surface: "personal", cardinality: "one", external: false, autonomous: false, format: "event" },
  ],
  outputs: [
    { type: "channel", endpoint: "telegram-bot-chat", surface: "personal", cardinality: "one", external: false, autonomous: false, format: "text" },
    { type: "store", endpoint: "telegram_notes", surface: "personal", cardinality: "one", external: false, autonomous: false, format: "record" },
  ],
};
