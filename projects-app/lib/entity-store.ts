import { db } from "@/lib/db";
import { createNodeId } from "@/lib/cuid";

// THE GENERIC ENTITY STORE (step 238) — pure storage over entity_transport/entity_history. Deliberately
// ZERO dependencies on domain modules (lib/nodes.ts, lib/edges.ts, lib/use-cases.ts): those modules import
// FROM here (to archive/read their own entity's history) — if this file imported back from any of them, it
// would create a circular module dependency. lib/entity-architecture.ts (the bundler) sits ABOVE this file:
// it imports the domain modules AND this store, and does the per-entity EXTRACTION; nothing should import
// FROM entity-architecture.ts except the two master routes and the 27 per-entity sub-API routes.

// FOUR entities (node/edge/usecase/chain) already have real authored content today — their extractors read
// from that EXISTING storage (files + entity_history/automation_use_cases/chain-spec.md). Node/Edge/Usecase
// history is CUID-scoped (ref-based helpers below); Chain (and the other automation-wide entities) use the
// automation-scoped helpers, since their ref is always '' — shared across every automation.
// FIVE entities (dashboard/analytics/calendar/map/processes) have NO authoring surface yet — Phases 5-9
// build their real authoring UI + wire it onto entity_transport/entity_history like the other four.
// STEP 239 — a TENTH entity: `fork-activation`. It is the design surface an INSTANCED automation had none of:
// how a run is started — which start settings it takes (e.g. the article's keyword), how a fork is created and
// those settings passed into it, and how its launch is scheduled (now / at a time / rate-limited). Like the
// five requirement entities it is automation-wide (ref='') and carries a free-text brief; unlike them it has
// no visibility toggle — it is always present for an `instanced` automation and absent for the other types.
export type EntityType =
  | "node" | "edge" | "usecase" | "chain"
  | "dashboard" | "analytics" | "calendar" | "map" | "processes"
  | "fork-activation";

export const ENTITY_TYPES: EntityType[] = [
  "node", "edge", "usecase", "chain", "dashboard", "analytics", "calendar", "map", "processes",
  "fork-activation",
];

// ─── THE UNIFIED SLICE CONTRACT (step 238, strengthened after review) ──────────────────────────────────
// Owner's requirement: max legibility for a WEAK model + scales to an automation with HUNDREDS of nodes.
// A first sketch (one `currentTask` per entity type) was wrong — node/edge/usecase can have hundreds of
// INSTANCES per automation (many nodes), while chain/dashboard/analytics/calendar/map/processes have
// exactly ONE instance per automation (ref=''). Only an ARRAY of instances serves "one" and "hundreds"
// identically — quantity differs, shape never does. A weak model learns EXACTLY ONE pattern for all 9
// entity types: find `instances[]`, check `pending`, if true read `currentTask`.

/** One archived, resolved task — the SAME shape as `currentTask`, just wrapped with when it was archived
 *  and which Development Step consumed it. */
export type EntityTaskRecord<TTask> = {
  version: number;
  task: TTask;
  devStepRef: string | null;
  createdAt: string;
};

/** ONE instance of an entity — a node, an edge, a use case, or the single "instance" of an automation-wide
 *  entity (chain/dashboard/...). `identity` carries descriptive facts (cuid, slug, status, draft, members)
 *  — NOT the task; `currentTask`/`history[].task` share the identical `TTask` shape, deliberately flat (1-3
 *  plain string fields) so "what do I need to do" never needs entity-specific parsing. */
export type EntityInstance<TTask, TIdentity> = {
  ref: string;                 // '' for automation-wide; cuid for node/edge/usecase
  identity: TIdentity;
  pending: boolean;            // ALWAYS derived from (currentTask !== null) by makeInstance() below — never
                                // set independently, so it can never drift from currentTask. Exposed as its
                                // own field so a weak model does a plain key check, never a null-inference.
  currentTask: TTask | null;   // null = nothing pending right now
  history: EntityTaskRecord<TTask>[];
};

/** Builds one instance, deriving `pending` from `currentTask` so the two fields can never disagree. */
export function makeInstance<TTask, TIdentity>(
  ref: string, identity: TIdentity, currentTask: TTask | null, history: EntityTaskRecord<TTask>[],
): EntityInstance<TTask, TIdentity> {
  return { ref, identity, pending: currentTask !== null, currentTask, history };
}

export type EntitySlice<TTask = unknown, TIdentity = unknown> = {
  entityType: EntityType;
  instances: EntityInstance<TTask, TIdentity>[];  // length 1 for chain/stubs, length N for node/edge/usecase
  error?: string; // set when this ONE entity's extraction failed — never aborts the whole bundle
};

// ─── GENERIC TRANSPORT (the current, not-yet-developed brief) ──────────────────────────────────────────
// `ref` is '' for automation-wide entities (chain, dashboard, analytics, calendar, map, processes) — NEVER
// null (SQLite's UNIQUE treats every NULL as distinct, which would silently allow duplicate rows).

export async function getTransport(
  automation: string, entityType: EntityType, ref = "",
): Promise<{ payload: unknown; updatedAt: string } | null> {
  const row = (await db
    .prepare(`SELECT payload_json, updated_at FROM entity_transport WHERE automation=? AND entity_type=? AND entity_ref=?`)
    .get(automation, entityType, ref)) as { payload_json: string; updated_at: string } | undefined;
  if (!row) return null;
  try {
    return { payload: JSON.parse(row.payload_json), updatedAt: row.updated_at };
  } catch {
    return null;
  }
}

export async function setTransport(
  automation: string, entityType: EntityType, ref: string, payload: unknown,
): Promise<void> {
  await db.prepare(
    `INSERT INTO entity_transport (id, automation, entity_type, entity_ref, payload_json, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(automation, entity_type, entity_ref) DO UPDATE SET
       payload_json = excluded.payload_json, updated_at = excluded.updated_at`,
  ).run(createNodeId(), automation, entityType, ref, JSON.stringify(payload ?? {}));
}

// ─── GENERIC HISTORY (append-only, never cleared) ───────────────────────────────────────────────────────

export async function getHistory(
  automation: string, entityType: EntityType, ref = "",
): Promise<{ version: number; payload: unknown; devStepRef: string | null; createdAt: string }[]> {
  const rows = (await db
    .prepare(
      `SELECT version, payload_json, dev_step_ref, created_at FROM entity_history
       WHERE automation=? AND entity_type=? AND entity_ref=? ORDER BY version ASC`,
    )
    .all(automation, entityType, ref)) as { version: number; payload_json: string; dev_step_ref: string | null; created_at: string }[];
  return rows.map((r) => {
    let payload: unknown = {};
    try { payload = JSON.parse(r.payload_json); } catch { /* corrupt row -> empty */ }
    return { version: r.version, payload, devStepRef: r.dev_step_ref, createdAt: r.created_at };
  });
}

/** Archives the CURRENT transport payload as the next history version, then clears the transport slot —
 *  the "consumed by development, container resets" half of the standard. Phases 1-9 call this at the point
 *  a Development Step actually consumes the brief. */
export async function archiveAndClearTransport(
  automation: string, entityType: EntityType, ref = "", devStepRef?: string,
): Promise<void> {
  const current = await getTransport(automation, entityType, ref);
  if (!current) return;
  const last = (await db
    .prepare(`SELECT MAX(version) AS v FROM entity_history WHERE automation=? AND entity_type=? AND entity_ref=?`)
    .get(automation, entityType, ref)) as { v: number | null };
  const nextVersion = (last.v ?? 0) + 1;
  await db.prepare(
    `INSERT INTO entity_history (id, automation, entity_type, entity_ref, version, payload_json, dev_step_ref)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(createNodeId(), automation, entityType, ref, nextVersion, JSON.stringify(current.payload), devStepRef ?? null);
  await db.prepare(`DELETE FROM entity_transport WHERE automation=? AND entity_type=? AND entity_ref=?`)
    .run(automation, entityType, ref);
}

// ─── NODE/EDGE/USECASE VERSION HISTORY ON THE GENERIC TABLE (step 238 Phase 1/2/3) ─────────────────────
// Node, edge and use-case identity is a CUID, already globally unique on its own (never reused across
// automations — "weak models mangle the UUID format" is why this project picked CUIDs, step 224). So these
// ref-scoped helpers look up by (entity_type, entity_ref) alone — `automation` is still stored on write
// (required by the schema, NOT NULL) but is redundant for uniqueness here, unlike automation-wide entities
// (chain, dashboard, ...) where entity_ref is '' and automation is the ONLY disambiguator. An edge belongs
// to no single automation (it sits BETWEEN two) — its rows use automation:'' by convention, mirroring the
// automation-wide sentinel.

export async function listVersionsByRef(
  entityType: EntityType, ref: string,
): Promise<{ version: number; payload: unknown; devStepRef: string | null; createdAt: string }[]> {
  await migrateLegacyVersionsOnce();
  const rows = (await db
    .prepare(`SELECT version, payload_json, dev_step_ref, created_at FROM entity_history WHERE entity_type=? AND entity_ref=? ORDER BY version DESC`)
    .all(entityType, ref)) as { version: number; payload_json: string; dev_step_ref: string | null; created_at: string }[];
  return rows.map((r) => {
    let payload: unknown = {};
    try { payload = JSON.parse(r.payload_json); } catch { /* corrupt row -> empty */ }
    return { version: r.version, payload, devStepRef: r.dev_step_ref, createdAt: r.created_at };
  });
}

export async function getVersionByRef(
  entityType: EntityType, ref: string, version: number,
): Promise<{ payload: unknown; devStepRef: string | null; createdAt: string } | null> {
  await migrateLegacyVersionsOnce();
  const row = (await db
    .prepare(`SELECT payload_json, dev_step_ref, created_at FROM entity_history WHERE entity_type=? AND entity_ref=? AND version=?`)
    .get(entityType, ref, version)) as { payload_json: string; dev_step_ref: string | null; created_at: string } | undefined;
  if (!row) return null;
  try {
    return { payload: JSON.parse(row.payload_json), devStepRef: row.dev_step_ref, createdAt: row.created_at };
  } catch {
    return null;
  }
}

export async function writeVersionByRef(
  automation: string, entityType: EntityType, ref: string, version: number, payload: unknown, devStepRef: string | null,
): Promise<void> {
  await migrateLegacyVersionsOnce();
  await db.prepare(
    `INSERT INTO entity_history (id, automation, entity_type, entity_ref, version, payload_json, dev_step_ref)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(createNodeId(), automation, entityType, ref, version, JSON.stringify(payload ?? {}), devStepRef);
}

/** The next version number for a CUID-scoped entity (node/edge/usecase — ref alone disambiguates). */
export async function nextVersionByRef(entityType: EntityType, ref: string): Promise<number> {
  const versions = await listVersionsByRef(entityType, ref); // DESC
  return (versions[0]?.version ?? 0) + 1;
}

/** The next version number for an AUTOMATION-SCOPED entity (chain and the other automation-wide entities,
 *  ref=''). NEVER use listVersionsByRef/nextVersionByRef for these — ref='' is shared by every automation,
 *  so a ref-only lookup would collide across DIFFERENT automations' chain history. */
export async function nextVersionForAutomation(automation: string, entityType: EntityType, ref = ""): Promise<number> {
  const history = await getHistory(automation, entityType, ref); // ASC
  return (history[history.length - 1]?.version ?? 0) + 1;
}

// ─── ONE-TIME LEGACY DATA MIGRATION (step 238 Phase 1/2) ───────────────────────────────────────────────
// Copies every pre-existing row of the bespoke automation_node_versions/automation_edge_versions tables
// into the new generic entity_history — real history already recorded on a live server must survive the
// switch. INSERT OR IGNORE + the table's own UNIQUE(automation, entity_type, entity_ref, version) makes this
// idempotent and race-safe (concurrent requests may all attempt it; only the first actually inserts each
// row). The legacy tables are NEVER dropped and NEVER written to again after this ships — they simply stop
// being the write target (no risk to already-recorded history if anything here needs to be re-verified).
// A shared PROMISE, not a boolean — a concurrent caller arriving while the first migration is still running
// (its selects/inserts are async) awaits the SAME in-flight promise instead of seeing "already started" and
// reading entity_history before the copy finishes (the lesson from the runner race, step 230).
let legacyVersionsMigration: Promise<void> | null = null;

export function migrateLegacyVersionsOnce(): Promise<void> {
  if (!legacyVersionsMigration) legacyVersionsMigration = runLegacyVersionsMigration();
  return legacyVersionsMigration;
}

async function runLegacyVersionsMigration(): Promise<void> {
  type NodeVersionRow = {
    automation: string; node_cuid: string; version: number; meta_json: string; functions_src: string;
    instruction_src: string; spec_src: string; summary: string; dev_step_ref: string | null; created_at: string;
  };
  const nodeRows = (await db.prepare(`SELECT * FROM automation_node_versions`).all()) as NodeVersionRow[];
  for (const r of nodeRows) {
    const payload = {
      metaJson: r.meta_json, functionsSrc: r.functions_src, instructionSrc: r.instruction_src,
      specSrc: r.spec_src, summary: r.summary,
    };
    await db.prepare(
      `INSERT OR IGNORE INTO entity_history (id, automation, entity_type, entity_ref, version, payload_json, dev_step_ref, created_at)
       VALUES (?, ?, 'node', ?, ?, ?, ?, ?)`,
    ).run(createNodeId(), r.automation, r.node_cuid, r.version, JSON.stringify(payload), r.dev_step_ref, r.created_at);
  }
  type EdgeVersionRow = {
    edge_cuid: string; version: number; meta_json: string; functions_src: string;
    spec_src: string; summary: string; dev_step_ref: string | null; created_at: string;
  };
  const edgeRows = (await db.prepare(`SELECT * FROM automation_edge_versions`).all()) as EdgeVersionRow[];
  for (const r of edgeRows) {
    const payload = { metaJson: r.meta_json, functionsSrc: r.functions_src, specSrc: r.spec_src, summary: r.summary };
    await db.prepare(
      `INSERT OR IGNORE INTO entity_history (id, automation, entity_type, entity_ref, version, payload_json, dev_step_ref, created_at)
       VALUES (?, '', 'edge', ?, ?, ?, ?, ?)`,
    ).run(createNodeId(), r.edge_cuid, r.version, JSON.stringify(payload), r.dev_step_ref, r.created_at);
  }
}
