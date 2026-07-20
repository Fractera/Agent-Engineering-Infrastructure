import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { resolveProject } from "@/lib/nodes";
import { appendRecord, compactIfNeeded, foldJournal, type JournalRecord } from "@/lib/jsonl-store";

// THE RUN JOURNAL (block 4, owner 2026-07-20) — what used to be automation_runs + automation_run_nodes.
//
// One journal per automation: `_data/runtime/runs.jsonl`, next to the automation it belongs to. A run is
// written once and then PATCHED as it progresses (current node, per-node status, the final outcome); every
// patch is one appended line, and readers fold them. Deleting an automation removes its runs with its
// folder — no orphan rows can survive it.
//
// Field names stay the SQL ones (id, run_id, node_id, current_node, started_at…) so the routes and the
// canvas that read them keep working untouched — the storage moved, the shape did not.

export type RunRow = {
  id: string; automation: string; instance_id: string | null;
  current_node: string | null; status: string;
  started_at: string; finished_at: string | null; payload: string | null;
};
export type RunNodeRow = { id: string; run_id: string; node_id: string; status: string; payload: string | null };

const nowIso = () => new Date().toISOString().replace("T", " ").slice(0, 19); // same look as datetime('now')

function journalPath(automation: string): string | null {
  const proj = resolveProject(automation);
  return proj.ok ? join(proj.projectDir, "_data", "runtime", "runs.jsonl") : null;
}

async function fold(automation: string): Promise<JournalRecord[]> {
  const file = journalPath(automation);
  if (!file) return [];
  return [...(await foldJournal(file)).values()];
}

async function write(automation: string, rec: JournalRecord): Promise<void> {
  const file = journalPath(automation);
  if (!file) return;
  await appendRecord(file, rec);
  void compactIfNeeded(file);
}

// ─── runs ────────────────────────────────────────────────────────────────────

export async function insertRun(
  automation: string,
  run: { id: string; instanceId?: string | null; currentNode?: string | null; status?: string; finishedAt?: string | null; payload?: string | null },
): Promise<void> {
  await write(automation, {
    id: run.id, __kind: "run",
    automation, instance_id: run.instanceId ?? null,
    current_node: run.currentNode ?? null, status: run.status ?? "running",
    started_at: nowIso(), finished_at: run.finishedAt ?? null, payload: run.payload ?? null,
  });
}

export async function patchRun(
  automation: string,
  id: string,
  patch: Partial<Pick<RunRow, "current_node" | "status" | "finished_at" | "payload">>,
): Promise<void> {
  await write(automation, { id, __kind: "run", ...patch });
}

export async function listRuns(automation: string): Promise<RunRow[]> {
  return (await fold(automation))
    .filter((r) => r.__kind === "run")
    .map((r) => r as unknown as RunRow)
    .sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)));
}

/** The newest run matching a filter — replaces the ORDER BY started_at DESC LIMIT 1 queries. */
export async function latestRun(
  automation: string,
  where: { instanceId?: string | null; status?: string } = {},
): Promise<RunRow | undefined> {
  return (await listRuns(automation)).find((r) =>
    (where.instanceId === undefined || r.instance_id === where.instanceId) &&
    (where.status === undefined || r.status === where.status));
}

export async function runById(automation: string, id: string): Promise<RunRow | undefined> {
  return (await listRuns(automation)).find((r) => r.id === id);
}

export async function hasAnyRun(automation: string): Promise<boolean> {
  return (await listRuns(automation)).length > 0;
}

/** Drop every run of this automation (the timeline's "Reset"). The journal is emptied rather than
 *  tombstoned line by line: reset means "there is no history", and an empty file says exactly that. */
export async function clearRuns(automation: string): Promise<void> {
  const file = journalPath(automation);
  if (!file) return;
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, "", "utf8");
}

/**
 * START ONE FORK, ONLY IF THE QUEUE IS FREE — the file-store equivalent of the conditional INSERT
 * `… WHERE NOT EXISTS (a running run) AND NOT EXISTS (a run of this fork)` that lib/schedule.ts relied on.
 *
 * SQLite gave that check-then-write atomicity for free by serializing writers. An append is atomic, but a
 * CHECK followed by an append is not — two polls arriving together could both see "no fork running" and
 * start two. So the whole read-decide-append runs inside a per-automation chain, which is exactly the
 * guarantee the old SQL bought: at most one fork of an automation runs at a time.
 */
const starting = new Map<string, Promise<unknown>>();

export async function startRunIfIdle(
  automation: string,
  run: { id: string; instanceId: string; currentNode: string | null; payload: string },
  nodes: { id: string; nodeId: string; status: string }[],
): Promise<boolean> {
  const prev = starting.get(automation) ?? Promise.resolve();
  const task = prev.then(async () => {
    const runs = await listRuns(automation);
    if (runs.some((r) => r.status === "running")) return false;      // a fork is already on the track
    if (runs.some((r) => r.instance_id === run.instanceId)) return false; // this fork already had its turn
    await insertRun(automation, {
      id: run.id, instanceId: run.instanceId, currentNode: run.currentNode, status: "running", payload: run.payload,
    });
    for (const n of nodes) {
      await insertRunNode(automation, { id: n.id, runId: run.id, nodeId: n.nodeId, status: n.status });
    }
    return true;
  });
  starting.set(automation, task.catch(() => undefined));
  return task;
}

// ─── the nodes of a run ──────────────────────────────────────────────────────

export async function insertRunNode(
  automation: string,
  node: { id: string; runId: string; nodeId: string; status: string; payload?: string | null },
): Promise<void> {
  await write(automation, {
    id: node.id, __kind: "run_node",
    run_id: node.runId, node_id: node.nodeId, status: node.status, payload: node.payload ?? null,
  });
}

export async function patchRunNode(
  automation: string,
  id: string,
  patch: Partial<Pick<RunNodeRow, "status" | "payload">>,
): Promise<void> {
  await write(automation, { id, __kind: "run_node", ...patch });
}

/** Patch by (run, node) instead of by row id — the shape lib/schedule.ts and the simulator use. */
export async function patchRunNodeByNode(
  automation: string,
  runId: string,
  nodeId: string,
  patch: Partial<Pick<RunNodeRow, "status" | "payload">>,
): Promise<void> {
  const target = (await fold(automation)).find(
    (r) => r.__kind === "run_node" && r.run_id === runId && r.node_id === nodeId,
  );
  if (!target) return;
  await write(automation, { id: target.id, __kind: "run_node", ...patch });
}

/** Patch EVERY node of a run (the "mark the whole run done" path). */
export async function patchAllRunNodes(
  automation: string,
  runId: string,
  patch: Partial<Pick<RunNodeRow, "status" | "payload">>,
): Promise<void> {
  for (const r of await runNodes(automation, runId)) {
    await write(automation, { id: r.id, __kind: "run_node", ...patch });
  }
}

export async function runNodes(automation: string, runId: string): Promise<RunNodeRow[]> {
  return (await fold(automation))
    .filter((r) => r.__kind === "run_node" && r.run_id === runId)
    .map((r) => r as unknown as RunNodeRow);
}
