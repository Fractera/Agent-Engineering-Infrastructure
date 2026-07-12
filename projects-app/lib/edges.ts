import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { createNodeId } from "@/lib/cuid";
import { listNodes, projectsRoot, resolveProject, syncIndexFromFiles } from "@/lib/nodes";

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

// ─── THE READINESS GATE (the step's central rule) ────────────────────────────────────────────────────
// A custom edge may be created ONLY between nodes whose development is FINISHED — i.e. an endpoint
// automation must not be "In development". Creating an edge always CHANGES its endpoint nodes (the parent
// and the child of the link), so they must be built first. "Finished" = the automation has nodes and NONE
// of them is still a draft.
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

/** Both endpoints must be finished — otherwise the edge is refused (and the canvas explains why). */
export async function edgeAllowed(from: string, to: string): Promise<{ allowed: boolean; from: Readiness; to: Readiness; message?: string }> {
  const [f, t] = [await automationReadiness(from), await automationReadiness(to)];
  if (f.ready && t.ready) return { allowed: true, from: f, to: t };
  const blocked = [f, t].filter((r) => !r.ready).map((r) => `${r.automation} (${r.drafts} node${r.drafts === 1 ? "" : "s"} still to build)`);
  return {
    allowed: false,
    from: f,
    to: t,
    message: `Custom links are created only for nodes whose development is finished. Still in development: ${blocked.join(", ")}.`,
  };
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
