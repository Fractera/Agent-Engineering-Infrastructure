import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveProject, listNodes, readNodeFiles } from "@/lib/nodes";
import { listEdges, readEdgeFiles, readChainSpec, groupMembers } from "@/lib/edges";
import { listCases, reviewState } from "@/lib/use-cases";
import { getLiveEntities } from "@/lib/entities-live";
import {
  type EntityType, ENTITY_TYPES, type EntitySlice, type EntityTaskRecord,
  getTransport, getHistory, listVersionsByRef, makeInstance,
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
// Every extractor below returns a fully-formed EntitySlice<TTask,TIdentity> (see lib/entity-store.ts for the
// contract): an array of `instances[]` — length 1 for automation-wide entities (chain/dashboard/analytics/
// calendar/map/processes, ref=''), length N for per-instance entities (node/edge/usecase, ref=cuid). Each
// instance's `pending`/`currentTask` are built via `makeInstance()` so the two can never drift apart.
//
// FOUR entities (node/edge/usecase/chain) already have real authored content today — their extractors read
// from that EXISTING storage (files + entity_history/automation_use_cases/chain-spec.md). FIVE entities
// (dashboard/analytics/calendar/map/processes) have only the free-text "Requirement" brief (step 238 P5-P9)
// as their authoring surface — their extractors report today's visibility toggle + that brief.

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

// ─── PER-ENTITY TASK/IDENTITY SHAPES ─────────────────────────────────────────────────────────────────────
// Deliberately flat, near-identical in KIND (1-3 plain string fields) across all 9 — "what do I need to
// do" never needs entity-specific parsing, only "read these string fields." Identity stays entity-specific
// (expected — descriptive facts about the instance, not the task itself).

type NodeIdentity = { cuid: string; slug: string; name: string; status: string; draft: boolean };
type NodeTask = { instruction: string; spec: string };

type EdgeIdentity = { cuid: string; name: string; from: string; to: string; status: string; draft: boolean };
type EdgeTask = { spec: string };

type UsecaseIdentity = { cuid: string; ord: number };
type UsecaseTask = { title: string; summary: string; status: string };

type ChainMemberSnapshot = { automation: string; title?: string; description?: string; type?: string; nodes?: unknown[]; error?: string };
type ChainIdentity = { members: string[]; memberSnapshots: ChainMemberSnapshot[] };
type ChainTask = { brief: string };

type StubIdentity = { toggleEnabled: boolean };
type StubTask = { brief: string };

// ─── PER-ENTITY EXTRACTORS ───────────────────────────────────────────────────────────────────────────────

async function extractNode(automation: string, withHistory: boolean): Promise<EntitySlice<NodeTask, NodeIdentity>> {
  const proj = resolveProject(automation);
  if (!proj.ok) return { entityType: "node", instances: [] };
  // A CHAINED GROUP (step 234/236 — the `group`-kind subflow container on the global canvas) has no real
  // workflow of its own: its frozen skeleton still carries draft input/logic/output nodes, but the page
  // itself hides them (GroupDetailSection replaces DiagramSection). Serializing those skeleton drafts would
  // MISLEAD the reading agent — return an empty instance list; the passport's isChainedGroup:true + the
  // `chain` slice (brief + member snapshots) are the real architecture here.
  if ((await automationTypeOf(automation)) === "chained") {
    return { entityType: "node", instances: [] };
  }
  const nodes = await listNodes(automation);
  const instances = await Promise.all(nodes.map(async (n) => {
    const files = await readNodeFiles(proj.projectDir, n.slug);
    const identity: NodeIdentity = { cuid: n.cuid, slug: n.slug, name: n.name, status: n.status, draft: Boolean(n.draft) };
    // A draft node IS its pending task (an unbuilt spec.md/instruction.ts waiting for a coder).
    //
    // A MATERIALIZED node normally has nothing pending — the brief that built it lives in history. But since
    // step 240 it can have ONE thing pending: an OPTIMIZATION. When the owner edits a live node's system
    // instruction, the PATCH stages that new instruction in the node's transport slot (it used to be
    // dispatched by the panel's own button, which the wave replaced). Surfacing it here is what puts the
    // optimization into the wave — otherwise it would be silently dropped.
    let currentTask: NodeTask | null = n.draft ? { instruction: files.instruction, spec: files.spec } : null;
    if (!n.draft) {
      const t = await getTransport(automation, "node", n.cuid);
      const p = t?.payload as { instruction?: string; spec?: string } | undefined;
      if (p?.instruction?.trim()) currentTask = { instruction: p.instruction, spec: p.spec ?? "" };
    }
    let history: EntityTaskRecord<NodeTask>[] = [];
    if (withHistory) {
      // Oldest first — a chronological story. Reads the GENERIC entity_history table (step 238 Phase 1).
      const versions = [...(await listVersionsByRef("node", n.cuid))].reverse();
      history = versions.map((v) => {
        const p = v.payload as { specSrc?: string; instructionSrc?: string };
        return { version: v.version, task: { instruction: p.instructionSrc ?? "", spec: p.specSrc ?? "" }, devStepRef: v.devStepRef, createdAt: v.createdAt };
      });
    }
    return makeInstance(n.cuid, identity, currentTask, history);
  }));
  return { entityType: "node", instances };
}

async function extractEdge(automation: string, withHistory: boolean): Promise<EntitySlice<EdgeTask, EdgeIdentity>> {
  const all = await listEdges();
  const edges = all.filter((e) => e.from_automation === automation || e.to_automation === automation);
  const instances = await Promise.all(edges.map(async (e) => {
    const files = await readEdgeFiles(e.cuid);
    const identity: EdgeIdentity = {
      cuid: e.cuid, name: e.name, from: e.from_automation, to: e.to_automation,
      status: e.status, draft: Boolean(e.draft),
    };
    const currentTask: EdgeTask | null = e.draft ? { spec: files.spec } : null;
    let history: EntityTaskRecord<EdgeTask>[] = [];
    if (withHistory) {
      const versions = [...(await listVersionsByRef("edge", e.cuid))].reverse();
      history = versions.map((v) => {
        const p = v.payload as { specSrc?: string };
        return { version: v.version, task: { spec: p.specSrc ?? "" }, devStepRef: v.devStepRef, createdAt: v.createdAt };
      });
    }
    return makeInstance(e.cuid, identity, currentTask, history);
  }));
  return { entityType: "edge", instances };
}

async function extractUsecase(automation: string, withHistory: boolean): Promise<EntitySlice<UsecaseTask, UsecaseIdentity>> {
  const cases = await listCases(automation);
  const instances = await Promise.all(cases.map(async (c) => {
    const identity: UsecaseIdentity = { cuid: c.cuid, ord: c.ord };
    // A case's content IS the task until it has been reviewed/approved — "new"/"in-approval" means the
    // owner has not yet agreed the AI understood correctly, so its current text is still a pending ask.
    // Once approved+ (in-development/testing/in-use), nothing is pending — the case now describes settled
    // behaviour, not a to-do (a later edit is a NEW change, captured by history at that point).
    const currentTask: UsecaseTask | null =
      c.status === "new" || c.status === "in-approval"
        ? { title: c.title, summary: c.summary, status: c.status }
        : null;
    let history: EntityTaskRecord<UsecaseTask>[] = [];
    if (withHistory) {
      // Each edit/status transition archives the OUTGOING state (lib/use-cases.ts archiveCaseVersion,
      // called from updateCase/deleteCase before the mutation lands) — CUID-scoped like node/edge.
      const versions = [...(await listVersionsByRef("usecase", c.cuid))].reverse();
      history = versions.map((v) => {
        const p = v.payload as { title?: string; summary?: string; status?: string };
        return { version: v.version, task: { title: p.title ?? "", summary: p.summary ?? "", status: p.status ?? "" }, devStepRef: v.devStepRef, createdAt: v.createdAt };
      });
    }
    return makeInstance(c.cuid, identity, currentTask, history);
  }));
  return { entityType: "usecase", instances };
}

async function extractChain(automation: string, withHistory: boolean): Promise<EntitySlice<ChainTask, ChainIdentity>> {
  const brief = await readChainSpec(automation);
  const members = await groupMembers(automation);
  // SHALLOW member snapshots (owner's explicit "must support chained flow / group nodes"): member names
  // alone are useless to an agent designing the chain — it needs each member's identity + node surface to
  // reason about hand-offs. Shallow on purpose: identity + node names/statuses, never the members' full
  // bundles (an agent that needs a member's depth calls the master route FOR that member).
  const memberSnapshots: ChainMemberSnapshot[] = await Promise.all(members.map(async (m) => {
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
  const identity: ChainIdentity = { members, memberSnapshots };
  const currentTask: ChainTask | null = brief.trim() ? { brief } : null;
  let history: EntityTaskRecord<ChainTask>[] = [];
  if (withHistory) {
    // Chain is AUTOMATION-SCOPED (ref='' — shared across every automation), so its history reads through
    // the automation-scoped getHistory, never the CUID ref-based helpers (step 238 Phase 4).
    const versions = await getHistory(automation, "chain", "");
    history = versions.map((v) => {
      const p = v.payload as { brief?: string };
      return { version: v.version, task: { brief: p.brief ?? "" }, devStepRef: v.devStepRef, createdAt: v.createdAt };
    });
  }
  return { entityType: "chain", instances: [makeInstance("", identity, currentTask, history)] };
}

// `fork-activation` (step 239) rides the SAME stub shape — automation-wide, one free-text brief — so it needs
// no extractor of its own. The one difference is `toggleEnabled`: it has no visibility switch (it is simply
// always there for an `instanced` automation), so extractStub reports `true` for it rather than reading a
// toggle that does not exist.
type StubEntityType = "dashboard" | "analytics" | "calendar" | "map" | "processes" | "fork-activation";

// Dashboard/Analytics/Calendar/Map/Processes (step 238 P5-P9) — the owner writes a free-text REQUIREMENT
// brief (the "Requirement" panel in each entity's accordion), automation-scoped (ref=''), same shape as the
// chain brief. This is a data-entry surface, not a builder — no dedicated node/table like dashboard's own
// live rows (228/229); it exists purely to carry the owner's NEXT requested change through to a coding
// agent via JSON1/JSON2, same as every other entity.
async function extractStub(entityType: StubEntityType, automation: string, withHistory: boolean): Promise<EntitySlice<StubTask, StubIdentity>> {
  const [live, transport] = await Promise.all([
    getLiveEntities(automation),
    getTransport(automation, entityType, ""),
  ]);
  const identity: StubIdentity = {
    toggleEnabled: entityType === "fork-activation" ? true : Boolean(live[entityType as keyof typeof live]),
  };
  const briefText = (transport?.payload as { brief?: string } | undefined)?.brief ?? "";
  const currentTask: StubTask | null = briefText.trim() ? { brief: briefText } : null;
  let history: EntityTaskRecord<StubTask>[] = [];
  if (withHistory) {
    const versions = await getHistory(automation, entityType, "");
    history = versions.map((v) => {
      const p = v.payload as { brief?: string };
      return { version: v.version, task: { brief: p.brief ?? "" }, devStepRef: v.devStepRef, createdAt: v.createdAt };
    });
  }
  return { entityType, instances: [makeInstance("", identity, currentTask, history)] };
}

async function extractOne(entityType: EntityType, automation: string, withHistory: boolean): Promise<EntitySlice> {
  switch (entityType) {
    case "node": return extractNode(automation, withHistory);
    case "edge": return extractEdge(automation, withHistory);
    case "usecase": return extractUsecase(automation, withHistory);
    case "chain": return extractChain(automation, withHistory);
    default: return extractStub(entityType, automation, withHistory);
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
  "`passport` (what this automation IS: title, purpose, type, the owner's original instruction). For each " +
  "entity, read `instances[]` — one entry per node/edge/use-case, or a single entry for automation-wide " +
  "entities (chain/dashboard/analytics/calendar/map/processes). An instance with `pending:true` carries a " +
  "not-yet-developed `currentTask` — focus there first. If the passport says isChainedGroup:true, this " +
  "automation is a container of other automations — its real architecture is the `chain` slice (brief + " +
  "member snapshots), not its own nodes.";
const INTRO_CURRENT =
  "This is the CURRENT state of one automation's architecture, with no version history (every instance's " +
  "`history` is empty). Use it for the \"How it works\" description, use-case debugging, or as the 2nd+ " +
  "context object within an ongoing development session. Start with the `passport` (what this automation " +
  "IS). For each entity, read `instances[]` — one entry per node/edge/use-case, or a single entry for " +
  "automation-wide entities. An instance with `pending:true` carries a not-yet-developed `currentTask`. If " +
  "the passport says isChainedGroup:true, the real architecture is the `chain` slice, not this automation's " +
  "own nodes.";

/** One entity's slice, on its own — backs the 18 per-entity extract-* sub-APIs (the master bundler below
 *  calls this same function for all 9 entities, wrapped in Promise.allSettled for error isolation). */
export async function extractEntitySlice(entityType: EntityType, automation: string, withHistory: boolean): Promise<EntitySlice> {
  return extractOne(entityType, automation, withHistory);
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
    return { entityType: ENTITY_TYPES[i], instances: [], error: String(r.reason) };
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
