import { join } from "node:path";
import { db } from "@/lib/db";
import { resolveProject, listNodes, readNodeDuration } from "@/lib/nodes";

// PROCESSES / Gantt timeline scheduling (step 230). Each FORK (automation_instances) is a bar; its length
// is the sum of its nodes' estimated process times (node meta.ts estDurationMs), laid out as a priority
// queue (each fork starts when the previous finishes). The estimate is refined against reality: the actual
// start/end from automation_runs shift the queue when a run finishes earlier or later than planned. A fork's
// per-node overrides (223.C.4) subtract a fully-disabled node from the length — the deterministic recompute
// the owner asked for ("dogs not cats, 2000 words not 1000" changes the plan without calling the model).

type Instance = { id: string; overrides: Record<string, { disabledFunctions?: string[]; note?: string }>; status: string };

/** Nodes of an automation in run order, each with its est duration (ms). Read once, reused per fork. */
async function nodeDurations(automation: string): Promise<{ slug: string; name: string; ms: number }[]> {
  const proj = resolveProject(automation);
  if (!proj.ok) return [];
  const nodes = await listNodes(proj.automation); // ordered by ord, non-removed
  const out: { slug: string; name: string; ms: number }[] = [];
  for (const n of nodes) {
    if (n.draft === 1) continue; // a draft node is not built → not executed → no time on the timeline
    out.push({ slug: n.slug, name: n.name, ms: await readNodeDuration(proj.projectDir, n.slug) });
  }
  return out;
}

/** The nodes of ONE fork with its overrides applied: a node whose functions are all disabled contributes 0. */
function forkNodes(base: { slug: string; name: string; ms: number }[], inst: Instance): { name: string; ms: number }[] {
  return base.map((n) => {
    const ov = inst.overrides?.[n.slug];
    // A note narrows the work, not the time; only a fully-disabled node drops out of the length (deterministic).
    const disabled = ov?.disabledFunctions && ov.disabledFunctions.length > 0 && ov.disabledFunctions.includes("*");
    return { name: n.name, ms: disabled ? 0 : n.ms };
  });
}

export type ScheduleNode = { name: string; startMs: number; durationMs: number };
export type ScheduleRow = {
  instanceId: string; title: string; ord: number;
  plannedStart: number; plannedDurationMs: number;
  actualStart: number | null; actualEnd: number | null;
  status: string; nodes: ScheduleNode[];
};

async function instancesOf(automation: string): Promise<(Instance & { title: string; ord: number })[]> {
  const rows = (await db
    .prepare(`SELECT id, title, specialization, overrides, status, created_at FROM automation_instances WHERE automation = ? ORDER BY created_at ASC`)
    .all(automation)) as { id: string; title: string; overrides: string; status: string }[];
  return rows.map((r, i) => {
    let overrides: Instance["overrides"] = {};
    try { overrides = JSON.parse(r.overrides) as Instance["overrides"]; } catch { /* empty */ }
    return { id: r.id, title: r.title, overrides, status: r.status, ord: i };
  });
}

/** The actual run window of a fork, from automation_runs (the fact that refines the estimate). */
async function actualOf(automation: string, instanceId: string): Promise<{ start: number | null; end: number | null; running: boolean }> {
  const run = (await db
    .prepare(`SELECT started_at, finished_at, status FROM automation_runs WHERE automation = ? AND instance_id = ? ORDER BY started_at DESC LIMIT 1`)
    .get(automation, instanceId)) as { started_at: string | null; finished_at: string | null; status: string } | undefined;
  if (!run) return { start: null, end: null, running: false };
  const start = run.started_at ? Date.parse(run.started_at + "Z") : null;
  const end = run.finished_at ? Date.parse(run.finished_at + "Z") : null;
  return { start: Number.isFinite(start as number) ? start : null, end: Number.isFinite(end as number) ? end : null, running: run.status === "running" };
}

/** Recompute the schedule of an automation and upsert automation_schedule; returns the timeline rows. Forks
 *  are a priority queue: each starts when the previous PLANNED end (or its actual end, if it already ran)
 *  passes. Reality shifts the plan — if a fork finished early/late, the next fork's planned_start moves. */
export async function recomputeSchedule(automation: string): Promise<ScheduleRow[]> {
  const proj = resolveProject(automation);
  if (!proj.ok) return [];
  const insts = await instancesOf(proj.automation);
  if (!insts.length) return [];
  const base = await nodeDurations(proj.automation);

  const now = Date.now();
  let cursor = now; // when the next fork is planned to start
  const rows: ScheduleRow[] = [];

  for (const inst of insts) {
    const fn = forkNodes(base, inst);
    const plannedDurationMs = fn.reduce((s, n) => s + n.ms, 0);
    const act = await actualOf(proj.automation, inst.id);

    // A fork that already ran anchors on its actual start; otherwise it starts at the cursor.
    const plannedStart = act.start ?? cursor;
    const status = act.end ? "done" : act.running ? "running" : "scheduled";

    // Lay out the fork's nodes inside its bar (sequential).
    let nc = plannedStart;
    const nodes: ScheduleNode[] = fn.map((n) => { const s = nc; nc += n.ms; return { name: n.name, startMs: s, durationMs: n.ms }; });

    rows.push({
      instanceId: inst.id, title: inst.title, ord: inst.ord,
      plannedStart, plannedDurationMs,
      actualStart: act.start, actualEnd: act.end, status, nodes,
    });

    // The next fork starts when THIS one ends — by fact if it ran, else by plan.
    cursor = act.end ?? (plannedStart + plannedDurationMs);

    await db.prepare(
      `INSERT INTO automation_schedule (instance_id, automation, ord, planned_start, planned_duration_ms, actual_start, actual_end, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(instance_id) DO UPDATE SET
         ord = excluded.ord, planned_start = excluded.planned_start, planned_duration_ms = excluded.planned_duration_ms,
         actual_start = excluded.actual_start, actual_end = excluded.actual_end, status = excluded.status, updated_at = datetime('now')`,
    ).run(
      inst.id, proj.automation, inst.ord, new Date(plannedStart).toISOString(), plannedDurationMs,
      act.start ? new Date(act.start).toISOString() : null, act.end ? new Date(act.end).toISOString() : null, status,
    );
  }

  // Nearest first (priority order) — the closest planned start at the top.
  rows.sort((a, b) => a.plannedStart - b.plannedStart);
  return rows;
}

/** Every automation that has at least one fork — the set the cron tick recomputes. */
export async function automationsWithForks(): Promise<string[]> {
  const rows = (await db.prepare(`SELECT DISTINCT automation FROM automation_instances`).all()) as { automation: string }[];
  return rows.map((r) => r.automation);
}
