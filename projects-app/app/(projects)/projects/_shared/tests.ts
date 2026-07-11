// FROZEN STANDARD — an automation's TESTS (step 220).
//
// Why this exists: the Tests modal must not carry a hard-coded probe list per project (that is the
// non-scalable "custom test" the owner removed). Instead every probe is DECLARED as data — one per
// entity the automation touches, across three stages (input / intermediate / output). Each probe
// carries its OWN prepared success/error text; the test route only reports whether it passed, and the
// modal renders the declared text. So a new automation gets a Tests panel by writing data, not UI.
//
// Two layers of test routes (see app/(projects)/README.md — "The settings & tests declaration standard"):
//   - "shared"  → a frozen, project-agnostic route that depends on the CHANNEL TYPE, reused by every
//                 project: POST /api/projects/tests/<kind>  (openai | telegram | lightrag | google-calendar)
//   - "project" → a route under THIS project's own api folder, obeying the same { ok, detail } contract.
//
// The route contract (both layers): the endpoint answers { ok: boolean; detail?: string }. `detail` is
// for debugging only — the user-facing line comes from the declaration, not the route.

/** Frozen shared probe kinds — served by /api/projects/tests/[kind]. Depend on the channel TYPE. */
export type ProbeKind = "openai" | "telegram" | "lightrag" | "google-calendar";

/** Where the entity sits in the automation's flow. Groups the cards in the Tests modal. */
export type ProbeStage = "input" | "intermediate" | "output";

export type ProbeBinding =
  | { type: "shared"; kind: ProbeKind }
  | { type: "project"; route: string; method?: "GET" | "POST"; body?: Record<string, unknown> };

export type Probe = {
  /** Stable id, unique within the project. */
  id: string;
  /** Card title, e.g. "Telegram bot". */
  label: string;
  /** Card subtitle, e.g. "Bot token is valid". */
  hint: string;
  stage: ProbeStage;
  binding: ProbeBinding;
  /** Prepared line shown when the route reports ok. */
  successText: string;
  /** Prepared line shown when it fails. */
  errorText: string;
};

/** The shape a test route (shared or project) returns. */
export type ProbeResult = { ok: boolean; detail?: string };
