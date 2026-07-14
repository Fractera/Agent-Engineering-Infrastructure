import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { createNodeId } from "@/lib/cuid";
import { resolveProject, listNodes, readNodeFiles } from "@/lib/nodes";
import { listEdges, readEdgeFiles, readChainSpec, groupMembers } from "@/lib/edges";
import { listCases, reviewState } from "@/lib/use-cases";
import { getLiveEntities } from "@/lib/entities-live";

// UNIVERSAL ENTITY ARCHITECTURE BUNDLER (step 238, Phase 0) — the shared library behind:
//   - the 27 per-entity sub-APIs (add-new-transport-task-entry / extract-current-state-for-architecture /
//     extract-full-history-for-architecture, one triad per entity)
//   - the two master orchestrators (fetch-complete-automation-architecture-with-history,
//     fetch-current-automation-architecture-snapshot)
//
// FOUR entities (node/edge/usecase/chain) already have real authored content today — their extractors read
// from that EXISTING storage (files + automation_node_versions/automation_edge_versions/automation_use_cases/
// chain-spec.md). Node/Edge's history migration onto the new generic `entity_history` table is Phase 1/2 —
// until then their `extractFull` reads the pre-existing bespoke version tables directly (not yet migrated).
// FIVE entities (dashboard/analytics/calendar/map/processes) have NO authoring surface yet — their
// extractors report today's only signal (the visibility toggle) and are explicit stubs; Phases 5-9 build
// their real authoring UI + wire it onto entity_transport/entity_history like the other five.
export type EntityType =
  | "node" | "edge" | "usecase" | "chain"
  | "dashboard" | "analytics" | "calendar" | "map" | "processes";

export const ENTITY_TYPES: EntityType[] = [
  "node", "edge", "usecase", "chain", "dashboard", "analytics", "calendar", "map", "processes",
];

export type EntitySlice = {
  entityType: EntityType;
  pending: boolean; // true when a transport row has a non-empty payload — "changed since last consume"
  current: unknown;
  history?: unknown[]; // present only when the caller asked for full history
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
 *  a Development Step actually consumes the brief; not yet wired to anything in Phase 0. */
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

// ─── THE PASSPORT (the automation's own identity — the bundle's opening section) ───────────────────────
// Without it JSON1/JSON2 would carry nodes and cases of an automation whose NAME, PURPOSE and TYPE the
// reading agent never sees — the "How it works" answer would regress vs step 237 (which read README +
// description directly). The passport restores exactly that: title/description (_data/description.ts),
// the immutable type (_data/automation.ts), the owner's original instruction (_data/instruction.md),
// the README and the merged entity toggles.

async function automationTypeOf(automation: string): Promise<string> {
  const proj = resolveProject(automation);
  if (!proj.ok) return "stream";
  const t = await readFile(join(proj.projectDir, "_data", "automation.ts"), "utf8").catch(() => "");
  return (t.match(/AUTOMATION_TYPE[^=]*=\s*["']([a-z]+)["']/) ?? [])[1] ?? "stream";
}

/** A JSON string literal captured by regex from a _data/*.ts source → its decoded value. */
function jsonStr(m: RegExpMatchArray | null): string {
  try { return m ? (JSON.parse(m[1]) as string) : ""; } catch { return ""; }
}

async function extractPassport(automation: string): Promise<unknown> {
  const proj = resolveProject(automation);
  if (!proj.ok) return { error: proj.error };
  const read = (rel: string) => readFile(join(proj.projectDir, rel), "utf8").catch(() => "");
  const [descSrc, type, instruction, readme, configSrc] = await Promise.all([
    read("_data/description.ts"), automationTypeOf(automation),
    read("_data/instruction.md"), read("README.md"), read("_data/config.ts"),
  ]);
  const title = jsonStr(descSrc.match(/title:\s*("(?:[^"\\]|\\.)*")/));
  const description = jsonStr(descSrc.match(/description:\s*\n?\s*("(?:[^"\\]|\\.)*")/));
  const seedToggles: Record<string, boolean> = {};
  for (const m of configSrc.matchAll(/([a-z]+):\s*(true|false)/g)) seedToggles[m[1]] = m[2] === "true";
  const live = await getLiveEntities(automation);
  return {
    automation, title, description, type,
    isChainedGroup: type === "chained",
    ownerInstruction: instruction.trim(),
    readme: readme.trim(),
    entityToggles: { ...seedToggles, ...live },
  };
}

// ─── PER-ENTITY EXTRACTORS ───────────────────────────────────────────────────────────────────────────────

async function extractNode(automation: string, withHistory: boolean): Promise<{ current: unknown; history?: unknown[] }> {
  const proj = resolveProject(automation);
  if (!proj.ok) return { current: [] };
  // A CHAINED GROUP (step 234/236 — the `group`-kind subflow container on the global canvas) has no real
  // workflow of its own: its frozen skeleton still carries draft input/logic/output nodes, but the page
  // itself hides them (GroupDetailSection replaces DiagramSection). Serializing those skeleton drafts into
  // the bundle would MISLEAD the reading agent — mark the slice not-applicable and point at `chain` instead.
  if ((await automationTypeOf(automation)) === "chained") {
    return {
      current: {
        applicable: false,
        note: "This automation is a CHAINED GROUP — a canvas-only container of other automations. Its skeleton nodes are not part of its real architecture; read the `chain` slice (brief + member snapshots) instead.",
      },
      history: [],
    };
  }
  const nodes = await listNodes(automation);
  const current = await Promise.all(nodes.map(async (n) => {
    const files = await readNodeFiles(proj.projectDir, n.slug);
    return {
      cuid: n.cuid, slug: n.slug, name: n.name, status: n.status, draft: Boolean(n.draft),
      instruction: files.instruction, spec: files.spec,
    };
  }));
  if (!withHistory) return { current };
  // History carries the RAW briefs of every version (spec_src = the draft ТЗ, instruction_src = the
  // optimization ТЗ) — the owner's "исторические сырые задания". functions_src (the code) is deliberately
  // excluded: the active code lives on disk (Model B) and would bloat the bundle without adding design intent.
  const history = await Promise.all(nodes.map(async (n) => {
    const rows = (await db
      .prepare(`SELECT version, summary, spec_src, instruction_src, dev_step_ref, created_at FROM automation_node_versions WHERE node_cuid=? ORDER BY version ASC`)
      .all(n.cuid)) as { version: number; summary: string; spec_src: string; instruction_src: string; dev_step_ref: string | null; created_at: string }[];
    return { cuid: n.cuid, slug: n.slug, versions: rows };
  }));
  return { current, history };
}

async function extractEdge(automation: string, withHistory: boolean): Promise<{ current: unknown; history?: unknown[] }> {
  const all = await listEdges();
  const edges = all.filter((e) => e.from_automation === automation || e.to_automation === automation);
  const current = await Promise.all(edges.map(async (e) => {
    const files = await readEdgeFiles(e.cuid);
    return {
      cuid: e.cuid, name: e.name, from: e.from_automation, to: e.to_automation, status: e.status,
      draft: Boolean(e.draft), spec: files.spec,
    };
  }));
  if (!withHistory) return { current };
  // spec_src = the raw ТЗ of each version (same rationale as node history above; functions_src excluded).
  const history = await Promise.all(edges.map(async (e) => {
    const rows = (await db
      .prepare(`SELECT version, summary, spec_src, dev_step_ref, created_at FROM automation_edge_versions WHERE edge_cuid=? ORDER BY version ASC`)
      .all(e.cuid)) as { version: number; summary: string; spec_src: string; dev_step_ref: string | null; created_at: string }[];
    return { cuid: e.cuid, versions: rows };
  }));
  return { current, history };
}

async function extractUsecase(automation: string, withHistory: boolean): Promise<{ current: unknown; history?: unknown[] }> {
  const cases = await listCases(automation);
  const review = await reviewState(automation);
  const current = { cases, review };
  if (!withHistory) return { current };
  // No version history yet — closes in Phase 3 (a status transition will archive the outgoing state here).
  return { current, history: [{ note: "Use case history lands in step 238 Phase 3 — not yet recorded." }] };
}

async function extractChain(automation: string, withHistory: boolean): Promise<{ current: unknown; history?: unknown[] }> {
  const brief = await readChainSpec(automation);
  const members = await groupMembers(automation);
  // SHALLOW member snapshots (owner's explicit "must support chained flow / group nodes"): member names
  // alone are useless to an agent designing the chain — it needs each member's identity + node surface to
  // reason about hand-offs. Shallow on purpose: identity + node names/statuses, never the members' full
  // bundles (an agent that needs a member's depth calls the master route FOR that member).
  const memberSnapshots = await Promise.all(members.map(async (m) => {
    const proj = resolveProject(m);
    if (!proj.ok) return { automation: m, error: proj.error };
    const [descSrc, type, nodes] = await Promise.all([
      readFile(join(proj.projectDir, "_data", "description.ts"), "utf8").catch(() => ""),
      automationTypeOf(m),
      listNodes(m),
    ]);
    return {
      automation: m,
      title: jsonStr(descSrc.match(/title:\s*("(?:[^"\\]|\\.)*")/)),
      description: jsonStr(descSrc.match(/description:\s*\n?\s*("(?:[^"\\]|\\.)*")/)),
      type,
      nodes: nodes.map((n) => ({ slug: n.slug, name: n.name, status: n.status, draft: Boolean(n.draft) })),
    };
  }));
  const current = { brief, members, memberSnapshots };
  if (!withHistory) return { current };
  return { current, history: [{ note: "Chain-group history lands in step 238 Phase 4 — not yet recorded." }] };
}

type StubEntityType = "dashboard" | "analytics" | "calendar" | "map" | "processes";

async function extractStub(entityType: StubEntityType, automation: string, withHistory: boolean): Promise<{ current: unknown; history?: unknown[] }> {
  const live = await getLiveEntities(automation);
  const current = {
    toggleEnabled: Boolean(live[entityType]),
    note: `No authoring surface exists yet for ${entityType} — only its visibility switch. Lands in step 238 Phase 5-9.`,
  };
  if (!withHistory) return { current };
  return { current, history: [] };
}

async function extractOne(entityType: EntityType, automation: string, withHistory: boolean): Promise<{ current: unknown; history?: unknown[] }> {
  switch (entityType) {
    case "node": return extractNode(automation, withHistory);
    case "edge": return extractEdge(automation, withHistory);
    case "usecase": return extractUsecase(automation, withHistory);
    case "chain": return extractChain(automation, withHistory);
    default: return extractStub(entityType, automation, withHistory);
  }
}

/** Whether entity_type has ANY pending, not-yet-developed transport for this automation — drives the
 *  bundle's `pending` flag so a reading agent knows where to focus. Until each entity migrates onto
 *  entity_transport (Phases 1-4), the flag reads that entity's REAL current transport, wherever it lives
 *  today — otherwise a fresh chain brief / unconfirmed case set would show pending:false and the agent
 *  would skip exactly the place the owner told it to look. */
async function hasPendingTransport(automation: string, entityType: EntityType): Promise<boolean> {
  const row = await getTransport(automation, entityType, "");
  if (row && Object.keys((row.payload as Record<string, unknown>) ?? {}).length > 0) return true;
  switch (entityType) {
    case "node":
    case "edge": {
      // A draft node/edge IS its pending transport today (an unbuilt spec.md waiting for a coder).
      const rows = entityType === "node" ? await listNodes(automation) : await listEdges();
      return rows.some((n: { draft: number }) => n.draft === 1);
    }
    case "usecase": {
      // The review gate (step 231) is the use cases' transport: cases exist but the owner has not
      // (re-)confirmed them → the set carries not-yet-consumed change.
      const r = await reviewState(automation);
      return r.hasCases && !r.reviewed;
    }
    case "chain":
      // A non-empty chain brief is the group's transport until Phase 4 archives it on consume.
      return (await readChainSpec(automation)).trim().length > 0;
    default:
      return false;
  }
}

export type ArchitectureBundle = {
  automation: string;
  format: "full-with-history" | "current-snapshot";
  intro: string;
  generatedAt: string;
  /** The automation's own identity — title, description, type, the owner's instruction, README, toggles. */
  passport: unknown;
  entities: EntitySlice[];
};

const INTRO_FULL =
  "This is the COMPLETE architecture of one automation: every entity's current state AND its full version " +
  "history. Use it at the start of a coding-agent context window or for deep debugging. Start with the " +
  "`passport` (what this automation IS: title, purpose, type, the owner's original instruction). Entities " +
  "flagged pending:true carry a not-yet-developed task — focus there first. If the passport says " +
  "isChainedGroup:true, this automation is a container of other automations — its real architecture is the " +
  "`chain` slice (brief + member snapshots), not its own nodes.";
const INTRO_CURRENT =
  "This is the CURRENT state of one automation's architecture, with no version history. Use it for the " +
  "\"How it works\" description, use-case debugging, or as the 2nd+ context object within an ongoing " +
  "development session. Start with the `passport` (what this automation IS). Entities flagged pending:true " +
  "carry a not-yet-developed task. If the passport says isChainedGroup:true, the real architecture is the " +
  "`chain` slice (brief + member snapshots), not this automation's own nodes.";

/** One entity's slice, on its own — backs the 18 per-entity extract-* sub-APIs (the master bundler below
 *  calls this same function for all 9 entities, wrapped in Promise.allSettled for error isolation). */
export async function extractEntitySlice(entityType: EntityType, automation: string, withHistory: boolean): Promise<EntitySlice> {
  const [{ current, history }, pending] = await Promise.all([
    extractOne(entityType, automation, withHistory),
    hasPendingTransport(automation, entityType),
  ]);
  const slice: EntitySlice = { entityType, pending, current };
  if (withHistory) slice.history = history ?? [];
  return slice;
}

export async function buildArchitecture(automation: string, withHistory: boolean): Promise<ArchitectureBundle> {
  // The passport is isolated the same way the entity slices are — a broken description file must not
  // take the whole bundle down with it.
  const [passport, results] = await Promise.all([
    extractPassport(automation).catch((e) => ({ error: String(e) })),
    Promise.allSettled(ENTITY_TYPES.map((entityType) => extractEntitySlice(entityType, automation, withHistory))),
  ]);
  const entities: EntitySlice[] = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    return { entityType: ENTITY_TYPES[i], pending: false, current: null, error: String(r.reason) };
  });
  return {
    automation,
    format: withHistory ? "full-with-history" : "current-snapshot",
    intro: withHistory ? INTRO_FULL : INTRO_CURRENT,
    generatedAt: new Date().toISOString(),
    passport,
    entities,
  };
}
