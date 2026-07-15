// FROZEN STANDARD — an automation's ENTITIES (step 222; toggles moved to the menu + live store, step 237).
//
// Below the "Add or modify automation" button, a project shows a series of accordions — one per
// ENTITY (`diagram` renders separately, full-width, outside the accordion series — step 223.C). EVERY
// entity, including `diagram`, is a plain if/else on its live flag now — nothing is structurally
// mandatory any more (step 237, owner reversal of 222.1/231): the owner flips each one from the
// hamburger menu, and the switch takes effect instantly (see `use-entities-live.ts` — a live DB override
// merged over this seed, no rebuild). At this stage an enabled entity renders an EMPTY accordion whose
// title carries a hover tooltip explaining what it is; a disabled one is not rendered. Later the data
// inside each container will drive real interface generation.
//
// This registry IS the "table" of entities in code — reused by every project. See
// app/(projects)/README.md, "The automation entities (accordions) standard", for the prose table.
export type EntityKey = "controlpanel" | "diagram" | "calendar" | "cron" | "map" | "dashboard" | "processes" | "analytics" | "usecases" | "apppages";

export type EntityMeta = {
  /** Accordion title / switch label (English fallback — the menu and accordions show the 10-language
   *  string from `automation-menu-i18n.ts` instead; this is the code-level identifier). */
  label: string;
  /** Hover tooltip: what this entity/step means (English fallback, see above). */
  tooltip: string;
};

// Render order of the accordion series + the entities switch list in the menu.
export const ENTITY_ORDER: EntityKey[] = [
  "controlpanel",
  "diagram",
  "calendar",
  "cron",
  "map",
  "dashboard",
  "processes",
  "analytics",
  "usecases",
  "apppages",
];

export const ENTITY_META: Record<EntityKey, EntityMeta> = {
  controlpanel: {
    label: "Control panel",
    tooltip:
      "The launch console of this automation: send a test request, or — for an instanced automation — set the start settings of a fork run. On by default; hide it once the automation is finished.",
  },
  diagram: {
    label: "Diagram",
    tooltip:
      "The diagram that implements this project's automation. Minimal here; it grows into the real node graph of the automation. On by default (useful while building) — an automation ready for a non-technical owner can hide it.",
  },
  calendar: {
    label: "Calendar",
    tooltip:
      "For time-based events: reminders and dated items. Can integrate Google Calendar and other tools.",
  },
  cron: {
    label: "Cron",
    tooltip:
      "Periodic tick that wakes this automation up on a schedule (independent of the owner's own requests through the Hook/ask console) so scheduled work can be checked and actuated on time.",
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
  usecases: {
    label: "User cases",
    tooltip:
      "The cases agreed with the architect: what the automation should do. Hiding this switch only hides the accordion — the review gate before development steps stays mandatory regardless (step 231, unaffected by this switch).",
  },
  apppages: {
    label: "Application pages",
    tooltip:
      "Public pages of the application layer for EXTERNAL users of this automation — a registration page, a public interface. Pick a folder, declare a page, describe it by voice or Quiz; a coding agent builds it. Multilingual by default.",
  },
};

/** The per-project toggle map (in _data/config.ts) — the SEED / initial value a fresh automation is born
 *  with. The owner's live overrides (menu switches) are layered on top at runtime and win; this file
 *  never changes after that (no rebuild involved in toggling — see `use-entities-live.ts`). Consumers
 *  read it as `Partial` (a missing key = off), so adding a NEW entity later never breaks existing
 *  projects' configs.
 *
 *  Scaling — to add a new entity: (1) add its key to `EntityKey`, (2) add a row to `ENTITY_META`
 *  (label + tooltip), (3) place it in `ENTITY_ORDER`, (4) add its 10-language label/tooltip to
 *  `automation-menu-i18n.ts`. Existing projects need no edit — the key is simply absent from their
 *  config and reads as off until the owner enables it. */
export type EntitiesConfig = Record<EntityKey, boolean>;

// ─── ENTITY DISPLAY ORDER (step 241, owner) ─────────────────────────────────────────────────────────────
// The owner can DRAG the page's sections into any order (in the hamburger menu), and the accordions follow.
// The orderable list is every EntityKey PLUS `fork-activation` — the tenth entity (step 239), which renders
// as an accordion for an instanced automation but has no visibility switch. `diagram` is orderable too (it
// appears in the menu list), though it renders full-width above the accordions, so its rank only matters
// relative to the others if it were ever moved into the series.
export type OrderableKey = EntityKey | "fork-activation";

/** The default section order a project starts from (before the owner drags anything). */
export const DEFAULT_ENTITY_ORDER: OrderableKey[] = [...ENTITY_ORDER, "fork-activation"];

/** Merge a stored order with the default: honour the stored ranking, drop anything unknown, and APPEND any
 *  known key the stored order does not mention (so an automation whose order was saved before a new entity
 *  existed still shows that entity, at the end). Deterministic and total — every known key appears once. */
export function resolveEntityOrder(stored?: readonly string[] | null): OrderableKey[] {
  const known = new Set<string>(DEFAULT_ENTITY_ORDER);
  const seen = new Set<string>();
  const out: OrderableKey[] = [];
  for (const k of stored ?? []) {
    if (known.has(k) && !seen.has(k)) { out.push(k as OrderableKey); seen.add(k); }
  }
  for (const k of DEFAULT_ENTITY_ORDER) if (!seen.has(k)) out.push(k);
  return out;
}
