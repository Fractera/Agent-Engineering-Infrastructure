import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createNodeId } from "@/lib/cuid";
import { listNodes, projectsRoot, resolveProject, syncIndexFromFiles } from "@/lib/nodes";

// ─── THE CHAIN BRIEF (step 236.3) ────────────────────────────────────────────────────────────────────
// A "chained" automation's group panel has no Builder (it is a container, not a workflow) — instead the
// owner writes ONE free-text brief describing how its member automations should be wired together (the
// step-195 pub/sub mechanism: Subject + Trigger kind "event" + Action emits), the same "Start development"
// shape an edge already has. Stored flat, same convention as _data/instruction.md.
function chainSpecPath(automation: string): string | null {
  const proj = resolveProject(automation);
  return proj.ok ? join(proj.projectDir, "_data", "chain-spec.md") : null;
}

export async function readChainSpec(automation: string): Promise<string> {
  const p = chainSpecPath(automation);
  if (!p) return "";
  return (await readFile(p, "utf8").catch(() => "")).trim();
}

export async function writeChainSpec(automation: string, spec: string): Promise<void> {
  const p = chainSpecPath(automation);
  if (!p) return;
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, `${spec.trim()}\n`, "utf8");
}

/** Every automation currently nested inside `groupAutomation` (live layout, step 234.3/236.1). */
export async function groupMembers(groupAutomation: string): Promise<string[]> {
  const layout = await getGlobalLayout();
  return Object.entries(layout)
    .filter(([, entry]) => entry.parent === groupAutomation)
    .map(([automation]) => automation);
}

// GLOBAL EDGES (step 225) — a programmable integration BETWEEN two automations. An edge is a first-class
// entity with the same lifecycle as a node (draft -> spec -> development step -> coder -> version), and its
// code lives in its OWN folder: projects/_edges/<cuid>/{meta.json, spec.md, functions.ts} — the folder IS
// the edge (block 2 of the file-system refactor). It belongs to no
// project — it is between them — so deleting a project cascades to its edges and leaves no orphans.

export type EdgeRow = {
  cuid: string; from_automation: string; to_automation: string;
  from_node_cuid: string | null; to_node_cuid: string | null;
  name: string; draft: number; active_version: number; latest_version: number; status: string;
};

export function edgesRoot(): string {
  return join(projectsRoot(), "_edges");
}

// ─── THE EDGE RECORD ON DISK (block 2 of the file-system refactor, owner 2026-07-20) ──────────────────
// A global edge used to exist TWICE: its code in _edges/<cuid>/ and its identity in the automation_edges
// table — the same split that made the intra-automation graph drift (block 1). Now the folder IS the edge:
// `meta.json` is its whole record and the folder's existence is its existence. The old `meta.ts` stub is
// gone: it carried a SUBSET of the same fields (cuid/name/from/to) and would have been a third source.
//
// A deleted edge takes its folder with it — there is no tombstone, because nothing keys off a dead edge
// (its version history lives under its cuid in entity_history and survives independently).

const edgeDir = (cuid: string) => join(edgesRoot(), cuid);
const edgeMetaPath = (cuid: string) => join(edgeDir(cuid), "meta.json");

/** The on-disk record. Field names are the readable ones; toEdgeRow() maps to the row shape callers use. */
type EdgeRecord = {
  cuid: string; name: string; from: string; to: string;
  fromNodeCuid: string | null; toNodeCuid: string | null;
  draft: boolean; status: string; activeVersion: number; latestVersion: number;
  createdAt: string; updatedAt: string;
};

const toEdgeRow = (r: EdgeRecord): EdgeRow => ({
  cuid: r.cuid, from_automation: r.from, to_automation: r.to,
  from_node_cuid: r.fromNodeCuid ?? null, to_node_cuid: r.toNodeCuid ?? null,
  name: r.name, draft: r.draft ? 1 : 0,
  active_version: r.activeVersion ?? 0, latest_version: r.latestVersion ?? 0,
  status: r.status,
});

async function readEdgeRecord(cuid: string): Promise<EdgeRecord | null> {
  try {
    const raw = JSON.parse(await readFile(edgeMetaPath(cuid), "utf8")) as Partial<EdgeRecord>;
    if (!raw.cuid || !raw.from || !raw.to) return null;
    return {
      cuid: raw.cuid, name: raw.name ?? "", from: raw.from, to: raw.to,
      fromNodeCuid: raw.fromNodeCuid ?? null, toNodeCuid: raw.toNodeCuid ?? null,
      draft: raw.draft ?? true, status: raw.status ?? "draft",
      activeVersion: raw.activeVersion ?? 0, latestVersion: raw.latestVersion ?? 0,
      createdAt: raw.createdAt ?? "", updatedAt: raw.updatedAt ?? "",
    };
  } catch { return null; }
}

async function writeEdgeRecord(rec: EdgeRecord): Promise<void> {
  rec.updatedAt = new Date().toISOString();
  const target = edgeMetaPath(rec.cuid);
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(edgeDir(rec.cuid), { recursive: true });
  await writeFile(tmp, `${JSON.stringify(rec, null, 2)}\n`, "utf8");
  await rename(tmp, target);
}

/** Patch an edge's record (name, endpoints, lifecycle). The one door replacing every UPDATE on the table. */
export async function patchEdge(
  cuid: string,
  patch: Partial<Pick<EdgeRecord, "name" | "fromNodeCuid" | "toNodeCuid" | "draft" | "status" | "activeVersion" | "latestVersion">>,
): Promise<EdgeRow | undefined> {
  const rec = await readEdgeRecord(cuid);
  if (!rec) return undefined;
  Object.assign(rec, patch);
  await writeEdgeRecord(rec);
  return toEdgeRow(rec);
}

// ─── AUTOMATION READINESS (display only, step 224/225) ──────────────────────────────────────────────
// Still used by app/api/projects/global/route.ts GET to paint a project FULL RED while it is "In
// development" and to derive the global status pill. It is NO LONGER an edge-creation gate — step 236.3
// retired that rule entirely (an edge no longer cares whether either endpoint has draft nodes).
export type Readiness = { ready: boolean; automation: string; nodes: number; drafts: number; reason?: string };

export async function automationReadiness(automation: string): Promise<Readiness> {
  const proj = resolveProject(automation);
  if (!proj.ok) return { ready: false, automation, nodes: 0, drafts: 0, reason: "unknown automation" };
  await syncIndexFromFiles(proj.automation, proj.projectDir);
  const nodes = await listNodes(proj.automation);
  const drafts = nodes.filter((n) => n.draft === 1).length;
  if (!nodes.length) return { ready: false, automation, nodes: 0, drafts: 0, reason: "no nodes yet" };
  if (drafts) return { ready: false, automation, nodes: nodes.length, drafts, reason: "still in development" };
  return { ready: true, automation, nodes: nodes.length, drafts: 0 };
}

// ─── THE GLOBAL CANVAS LAYOUT (step 234.3) ────────────────────────────────────────────────────────────
// The global canvas (global-canvas.client.tsx) persists node positions AND group/subflow membership. It
// used to live in the global_automation table; since block 2 of the file-system refactor it is a file at
// the root of the projects tree, _data/global-automation.json, together with the global on/off status.
// Shared reader so app/api/projects/global/route.ts (renders the canvas), the same-group connection rule
// below, and groupMembers() (the chain brief) all parse the SAME shape identically.
export type LayoutEntry = {
  x: number;
  y: number;
  /** The automation this node is nested inside (a "chained" group container); absent/null = top-level. */
  parent?: string | null;
  /** Only meaningful for a "chained" automation's own group-container box. */
  width?: number;
  height?: number;
};
export type Layout = Record<string, LayoutEntry>;

/** The workspace-level state file: the canvas layout + the global on/off status. One file at the root of
 *  the projects tree, next to the automations it describes (block 2 of the file-system refactor). */
export type GlobalState = { status: string; layout: Layout };

const globalStatePath = () => join(projectsRoot(), "_data", "global-automation.json");

export async function readGlobalState(): Promise<GlobalState> {
  try {
    const raw = JSON.parse(await readFile(globalStatePath(), "utf8")) as Partial<GlobalState>;
    return {
      status: typeof raw.status === "string" ? raw.status : "in-development",
      layout: (raw.layout ?? {}) as Layout,
    };
  } catch {
    return { status: "in-development", layout: {} };
  }
}

export async function writeGlobalState(patch: Partial<GlobalState>): Promise<GlobalState> {
  const next = { ...(await readGlobalState()), ...patch };
  const target = globalStatePath();
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
  await mkdir(join(projectsRoot(), "_data"), { recursive: true });
  await writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await rename(tmp, target);
  return next;
}

export async function getGlobalLayout(): Promise<Layout> {
  return (await readGlobalState()).layout;
}

// ─── THE CONNECTION RULE (step 236.3, replaces the old readiness gate + the inverted nesting gate) ──────
// A custom edge may be created ONLY between two automations that are members of the SAME group — a group's
// members ARE the chain, and edges are how that chain gets defined. Draft/readiness state no longer matters
// at all (the old step-225 rule). `code` is a STABLE identifier, not a sentence — the client owns the
// translated copy (rule 4г), the server never emits English prose here.
export type SameGroupResult = { ok: boolean; code?: "not_in_group" | "different_groups" };

export async function sameGroup(from: string, to: string): Promise<SameGroupResult> {
  const layout = await getGlobalLayout();
  const fromParent = layout[from]?.parent ?? null;
  const toParent = layout[to]?.parent ?? null;
  if (!fromParent || !toParent) return { ok: false, code: "not_in_group" };
  if (fromParent !== toParent) return { ok: false, code: "different_groups" };
  return { ok: true };
}

// ─── the edge's co-located files (the same shape as a node's) ────────────────────────────────────────

export function edgeStubFiles(e: { cuid: string; name: string; from: string; to: string; spec: string }): Record<string, string> {
  return {
    "functions.ts": `import type { NodeFunction } from "../../_shared/node-contract";

// Draft — no integration code yet. The coder materializes these from spec.md (step 225).
export const FUNCTIONS: NodeFunction[] = [];
`,
    "spec.md": `${e.spec.trim() || "Describe how these two automations are connected: which output of the source node feeds which input of the target node, under what conditions, and how they stay in sync."}\n`,
  };
}

// ─── CRUD ────────────────────────────────────────────────────────────────────────────────────────────

export async function listEdges(): Promise<EdgeRow[]> {
  const records: EdgeRecord[] = [];
  for (const cuid of await edgeFoldersOnDisk()) {
    const rec = await readEdgeRecord(cuid);
    if (rec && rec.status !== "removed") records.push(rec);
  }
  records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return records.map(toEdgeRow);
}

export async function edgeByCuid(cuid: string): Promise<EdgeRow | undefined> {
  const rec = await readEdgeRecord(cuid);
  return rec ? toEdgeRow(rec) : undefined;
}

export async function createEdge(input: {
  from: string; to: string; name?: string; spec?: string; fromNodeCuid?: string | null; toNodeCuid?: string | null;
}): Promise<EdgeRow> {
  const cuid = createNodeId();
  const name = (input.name ?? "").trim() || `${input.from.split("/")[1]} → ${input.to.split("/")[1]}`;
  const dir = edgeDir(cuid);
  await mkdir(dir, { recursive: true });
  for (const [rel, body] of Object.entries(
    edgeStubFiles({ cuid, name, from: input.from, to: input.to, spec: input.spec ?? "" }),
  )) {
    await writeFile(join(dir, rel), body, "utf8");
  }
  const now = new Date().toISOString();
  const rec: EdgeRecord = {
    cuid, name, from: input.from, to: input.to,
    fromNodeCuid: input.fromNodeCuid ?? null, toNodeCuid: input.toNodeCuid ?? null,
    draft: true, status: "draft", activeVersion: 0, latestVersion: 0,
    createdAt: now, updatedAt: now,
  };
  await writeEdgeRecord(rec);
  return toEdgeRow(rec);
}

export async function removeEdge(cuid: string): Promise<void> {
  // The folder IS the edge — removing it removes the edge, record and code together. No tombstone row can
  // survive to haunt the canvas the way a stale index row used to.
  await rm(edgeDir(cuid), { recursive: true, force: true });
}

/** Deleting a project must not leave dangling links — cascade to every edge that touches it. */
export async function removeEdgesOfAutomation(automation: string): Promise<number> {
  const dead = (await listEdges()).filter((e) => e.from_automation === automation || e.to_automation === automation);
  for (const e of dead) await removeEdge(e.cuid);
  return dead.length;
}

/** Prune links whose project no longer exists (a project is deleted by removing its folder — there is no
 *  delete route). Without this the canvas would keep dangling edges and the validator would report orphan
 *  _edges/ folders. Called by the global-canvas read, so the graph is self-healing. */
export async function pruneDeadEdges(existingAutomations: string[]): Promise<number> {
  const alive = new Set(existingAutomations);
  const dead = (await listEdges()).filter((e) => !alive.has(e.from_automation) || !alive.has(e.to_automation));
  for (const e of dead) await removeEdge(e.cuid);
  return dead.length;
}

export async function readEdgeFiles(cuid: string): Promise<{ meta: string; functions: string; spec: string }> {
  const dir = edgeDir(cuid);
  const read = (f: string) => readFile(join(dir, f), "utf8").catch(() => "");
  // `meta` is the record itself now (meta.json), not a TS module that restated four of its fields.
  return { meta: await read("meta.json"), functions: await read("functions.ts"), spec: await read("spec.md") };
}

export async function writeEdgeSpec(cuid: string, spec: string): Promise<void> {
  await writeFile(join(edgeDir(cuid), "spec.md"), `${spec.trim()}\n`, "utf8");
}

/** Edge folders on disk (used by the validator to catch orphans). */
export async function edgeFoldersOnDisk(): Promise<string[]> {
  try {
    return (await readdir(edgesRoot(), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch { return []; }
}
