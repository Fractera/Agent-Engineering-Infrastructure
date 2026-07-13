import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { db } from "@/lib/db";
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
// code lives in its OWN folder: projects/_edges/<cuid>/{meta.ts, spec.md, functions.ts}. It belongs to no
// project — it is between them — so deleting a project cascades to its edges and leaves no orphans.

export type EdgeRow = {
  cuid: string; from_automation: string; to_automation: string;
  from_node_cuid: string | null; to_node_cuid: string | null;
  name: string; draft: number; active_version: number; latest_version: number; status: string;
};

export function edgesRoot(): string {
  return join(projectsRoot(), "_edges");
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
// The global canvas (global-canvas.client.tsx) persists node positions AND group/subflow membership in one
// JSON blob (global_automation.layout — no schema change, same free-form TEXT column since step 225). Shared
// reader so app/api/projects/global/route.ts (renders the canvas), the same-group connection rule below, and
// groupMembers() (the chain brief) all parse the SAME shape identically.
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

export async function getGlobalLayout(): Promise<Layout> {
  const row = (await db.prepare(`SELECT layout FROM global_automation WHERE id = 1`).get()) as
    | { layout: string }
    | undefined;
  if (!row?.layout) return {};
  try { return JSON.parse(row.layout) as Layout; } catch { return {}; }
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
  const meta = JSON.stringify({ cuid: e.cuid, name: e.name, from: e.from, to: e.to }, null, 2);
  return {
    "meta.ts": `// Edge (step 225) — a programmable integration BETWEEN two automations. It belongs to no project.
// Draft: no functions yet, a spec.md brief; the coder builds it and calls materialize.
export const META = ${meta} as const;
`,
    "functions.ts": `import type { NodeFunction } from "../../_shared/node-contract";

// Draft — no integration code yet. The coder materializes these from spec.md (step 225).
export const FUNCTIONS: NodeFunction[] = [];
`,
    "spec.md": `${e.spec.trim() || "Describe how these two automations are connected: which output of the source node feeds which input of the target node, under what conditions, and how they stay in sync."}\n`,
  };
}

// ─── CRUD ────────────────────────────────────────────────────────────────────────────────────────────

export async function listEdges(): Promise<EdgeRow[]> {
  return (await db.prepare(`SELECT * FROM automation_edges WHERE status != 'removed' ORDER BY created_at ASC`).all()) as EdgeRow[];
}

export async function edgeByCuid(cuid: string): Promise<EdgeRow | undefined> {
  return (await db.prepare(`SELECT * FROM automation_edges WHERE cuid = ?`).get(cuid)) as EdgeRow | undefined;
}

export async function createEdge(input: {
  from: string; to: string; name?: string; spec?: string; fromNodeCuid?: string | null; toNodeCuid?: string | null;
}): Promise<EdgeRow> {
  const cuid = createNodeId();
  const name = (input.name ?? "").trim() || `${input.from.split("/")[1]} → ${input.to.split("/")[1]}`;
  const dir = join(edgesRoot(), cuid);
  await mkdir(dir, { recursive: true });
  for (const [rel, body] of Object.entries(
    edgeStubFiles({ cuid, name, from: input.from, to: input.to, spec: input.spec ?? "" }),
  )) {
    await writeFile(join(dir, rel), body, "utf8");
  }
  await db.prepare(
    `INSERT INTO automation_edges (cuid, from_automation, to_automation, from_node_cuid, to_node_cuid, name)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(cuid, input.from, input.to, input.fromNodeCuid ?? null, input.toNodeCuid ?? null, name);
  return (await edgeByCuid(cuid)) as EdgeRow;
}

export async function removeEdge(cuid: string): Promise<void> {
  await db.prepare(`UPDATE automation_edges SET status = 'removed', updated_at = datetime('now') WHERE cuid = ?`).run(cuid);
  await rm(join(edgesRoot(), cuid), { recursive: true, force: true });
}

/** Deleting a project must not leave dangling links — cascade to every edge that touches it. */
export async function removeEdgesOfAutomation(automation: string): Promise<number> {
  const rows = (await db.prepare(
    `SELECT cuid FROM automation_edges WHERE (from_automation = ? OR to_automation = ?) AND status != 'removed'`,
  ).all(automation, automation)) as { cuid: string }[];
  for (const r of rows) await removeEdge(r.cuid);
  return rows.length;
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
  const dir = join(edgesRoot(), cuid);
  const read = (f: string) => readFile(join(dir, f), "utf8").catch(() => "");
  return { meta: await read("meta.ts"), functions: await read("functions.ts"), spec: await read("spec.md") };
}

export async function writeEdgeSpec(cuid: string, spec: string): Promise<void> {
  await writeFile(join(edgesRoot(), cuid, "spec.md"), `${spec.trim()}\n`, "utf8");
}

/** Edge folders on disk (used by the validator to catch orphans). */
export async function edgeFoldersOnDisk(): Promise<string[]> {
  try {
    return (await readdir(edgesRoot(), { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch { return []; }
}
