// FROZEN STANDARD — an automation's ENTITIES (step 222).
//
// Below the "Add or modify automation" button, a project shows a series of accordions — one per
// ENTITY. Each entity is OPTIONAL and toggled in the project's _data/config.ts (except `diagram`,
// which is always on with a minimal interface). At this stage an enabled entity renders an EMPTY
// accordion whose title carries a hover tooltip explaining what it is; a disabled one is not rendered.
// Later the data inside each container will drive real interface generation.
//
// This registry IS the "table" of entities in code — reused by every project. See
// app/(projects)/README.md, "The automation entities (accordions) standard", for the prose table.
export type EntityKey = "diagram" | "calendar" | "map" | "dashboard" | "processes" | "analytics";

export type EntityMeta = {
  /** Accordion title. */
  label: string;
  /** Hover tooltip: what this entity/step means. */
  tooltip: string;
  /** Always rendered regardless of config (currently only `diagram`). */
  mandatory?: boolean;
};

// Render order of the accordion series.
export const ENTITY_ORDER: EntityKey[] = [
  "diagram",
  "calendar",
  "map",
  "dashboard",
  "processes",
  "analytics",
];

export const ENTITY_META: Record<EntityKey, EntityMeta> = {
  diagram: {
    label: "Diagram",
    mandatory: true,
    tooltip:
      "The diagram that implements this project's automation. Minimal here; it grows into the real node graph of the automation.",
  },
  calendar: {
    label: "Calendar",
    tooltip:
      "For time-based events: reminders and dated items. Can integrate Google Calendar and other tools.",
  },
  map: {
    label: "Map",
    tooltip:
      "For tasks/events tied to a geographic location. Can integrate maps and location services.",
  },
  dashboard: {
    label: "Dashboard",
    tooltip:
      "Data-visualization slices — holds sub-dashboards when the automation needs different views of its data.",
  },
  processes: {
    label: "Processes",
    tooltip:
      "A timeline (Gantt) of automations — each with a start date, a duration and an end date. Pick a node to open its concrete diagram with the currently-running node highlighted. Common in content marketing, where each content generation is a sequence stretched over time.",
  },
  analytics: {
    label: "Analytics",
    tooltip:
      "Charts you define to summarize performance, in a clear interface built on shadcn/charts.",
  },
};

/** The per-project toggle map (in _data/config.ts). `diagram` stays true; a fresh skeleton has the rest off. */
export type EntitiesConfig = Record<EntityKey, boolean>;
