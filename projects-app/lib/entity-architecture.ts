import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveProject, listNodes, readNodeFiles } from "@/lib/nodes";
import { listEdges, readEdgeFiles, readChainSpec, groupMembers } from "@/lib/edges";
import { listCases, reviewState } from "@/lib/use-cases";
import { getLiveEntities } from "@/lib/entities-live";
import {
  type EntityType, ENTITY_TYPES, type EntitySlice,
  getTransport, getHistory, listVersionsByRef,
} from "@/lib/entity-store";

export type { EntityType, EntitySlice };
export { ENTITY_TYPES };

// UNIVERSAL ENTITY ARCHITECTURE BUNDLER (step 238) — the shared library behind:
//   - the 27 per-entity sub-APIs (add-new-transport-task-entry / extract-current-state-for-architecture /
//     extract-full-history-for-architecture, one triad per entity)
//   - the two master orchestrators (fetch-complete-automation-architecture-with-history,
//     fetch-current-automation-architecture-snapshot)
//
// This is the TOP of the entity-architecture dependency graph: it imports the domain modules (nodes/edges/
// use-cases) AND the generic storage layer (lib/entity-store.ts) to do the per-entity EXTRACTION. Nothing
// should import FROM this file except the two master routes and the 27 per-entity sub-API routes — the
// domain modules themselves (use-cases.ts, edges.ts) import storage primitives directly from
// lib/entity-store.ts, never from here, to avoid a circular module dependency.
//
// FOUR entities (node/edge/usecase/chain) already have real authored content today — their extractors read
// from that EXISTING storage (files + entity_history/automation_use_cases/chain-spec.md). Node/Edge/Usecase
// history (Phases 1/2/3) lives on the GENERIC entity_history table (lib/entity-store.ts migrates every
// pre-existing legacy row once, idempotently). FIVE entities (dashboard/analytics/calendar/map/processes)
// have NO authoring surface yet — their extractors report today's only signal (the visibility toggle) and
// are explicit stubs; Phases 5-9 build their real authoring UI + wire it onto entity_transport/entity_history.

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
  // History carries the RAW briefs of every version (specSrc = the draft ТЗ, instructionSrc = the
  // optimization ТЗ) — the owner's "исторические сырые задания". functionsSrc (the code) is deliberately
  // excluded: the active code lives on disk (Model B) and would bloat the bundle without adding design
  // intent. Read from the GENERIC entity_history table (step 238 Phase 1) — see listVersionsByRef.
  const history = await Promise.all(nodes.map(async (n) => {
    const versions = [...(await listVersionsByRef("node", n.cuid))].reverse(); // oldest first — a chronological story
    const rows = versions.map((v) => {
      const p = v.payload as { summary?: string; specSrc?: string; instructionSrc?: string };
      return { version: v.version, summary: p.summary ?? "", specSrc: p.specSrc ?? "", instructionSrc: p.instructionSrc ?? "", devStepRef: v.devStepRef, createdAt: v.createdAt };
    });
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
  // specSrc = the raw ТЗ of each version (same rationale as node history above; functionsSrc excluded).
  // Read from the GENERIC entity_history table (step 238 Phase 2) — see listVersionsByRef.
  const history = await Promise.all(edges.map(async (e) => {
    const versions = [...(await listVersionsByRef("edge", e.cuid))].reverse(); // oldest first
    const rows = versions.map((v) => {
      const p = v.payload as { summary?: string; specSrc?: string };
      return { version: v.version, summary: p.summary ?? "", specSrc: p.specSrc ?? "", devStepRef: v.devStepRef, createdAt: v.createdAt };
    });
    return { cuid: e.cuid, versions: rows };
  }));
  return { current, history };
}

async function extractUsecase(automation: string, withHistory: boolean): Promise<{ current: unknown; history?: unknown[] }> {
  const cases = await listCases(automation);
  const review = await reviewState(automation);
  const current = { cases, review };
  if (!withHistory) return { current };
  // Each case's own history, CUID-scoped like node/edge (step 238 Phase 3) — every edit and status
  // transition archives the OUTGOING state (see lib/use-cases.ts archiveCaseVersion, called from
  // updateCase/deleteCase before the mutation lands).
  const history = await Promise.all(cases.map(async (c) => {
    const versions = [...(await listVersionsByRef("usecase", c.cuid))].reverse(); // oldest first
    return { cuid: c.cuid, title: c.title, versions: versions.map((v) => ({ version: v.version, payload: v.payload, createdAt: v.createdAt })) };
  }));
  return { current, history };
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
  // Chain is AUTOMATION-SCOPED (ref='' — shared across every automation), so its history reads through the
  // automation-scoped getHistory, never the CUID ref-based helpers (step 238 Phase 4; the archival itself
  // happens in app/api/projects/chain-spec/route.ts's PATCH, before writeChainSpec overwrites the brief).
  const history = await getHistory(automation, "chain", "");
  return { current, history: history.map((v) => ({ version: v.version, payload: v.payload, createdAt: v.createdAt })) };
}

type StubEntityType = "dashboard" | "analytics" | "calendar" | "map" | "processes";

// Dashboard/Analytics/Calendar/Map/Processes (step 238 P5-P9) — the owner writes a free-text REQUIREMENT
// brief (the "Requirement" panel in each entity's accordion), same shape as the chain brief: automation-
// scoped (ref=''), archived-on-overwrite by the generic add-new-transport-task-entry route
// (entity-architecture-routes.ts). This is a data-entry surface, not a builder — no dedicated node/table
// like dashboard's own live rows (228/229); it exists purely to carry the owner's NEXT requested change
// through to a coding agent via JSON1/JSON2, same as every other entity.
async function extractStub(entityType: StubEntityType, automation: string, withHistory: boolean): Promise<{ current: unknown; history?: unknown[] }> {
  const [live, transport] = await Promise.all([
    getLiveEntities(automation),
    getTransport(automation, entityType, ""),
  ]);
  const current = {
    toggleEnabled: Boolean(live[entityType]),
    requirementBrief: (transport?.payload as { brief?: string } | undefined)?.brief ?? "",
  };
  if (!withHistory) return { current };
  const history = await getHistory(automation, entityType, "");
  return { current, history: history.map((v) => ({ version: v.version, payload: v.payload, createdAt: v.createdAt })) };
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
