import { db } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { resolveProject, listNodes, readNodeDuration, readNodeFunctionCount } from "@/lib/nodes";

// PROCESSES / Gantt timeline (step 230) + the minimal RUNNER (step 230 fix). Each FORK (automation_instances)
// is a bar; its length is the sum of its nodes' estimated process times (node meta.ts estDurationMs). Forks
// run one at a time, IN ORDER: the first fork starts, its nodes turn green (ok) as their time elapses, the
// whole fork turns green when it finishes, then the next fork starts. This is a DERIVED runner — a node
// "takes" its estDurationMs and is guaranteed success (a simple timed process, as the owner asked); the run
// state is persisted in automation_runs / automation_run_nodes, so a reload CONTINUES the run instead of
// restarting it. The real function-executing runner (223.C.6) will replace the derivation later; the shape
// (a run row + per-node statuses) is identical, so nothing above changes.

type Instance = { id: string; overrides: Record<string, { disabledFunctions?: string[]; note?: string }>; status: string };
type ForkNode = { slug: string; name: string; ms: number };

/** Nodes of an automation in run order, each with its est duration (ms) and its function count. */
async function nodeDurations(automation: string): Promise<{ slug: string; name: string; ms: number; fns: number }[]> {
  const proj = resolveProject(automation);
  if (!proj.ok) return [];
  const nodes = await listNodes(proj.automation); // ordered by ord, non-removed
  const out: { slug: string; name: string; ms: number; fns: number }[] = [];
  for (const n of nodes) {
    if (n.draft === 1) continue; // a draft node is not built → not executed → no time on the timeline
    out.push({
      slug: n.slug, name: n.name,
      ms: await readNodeDuration(proj.projectDir, n.slug),
      fns: await readNodeFunctionCount(proj.projectDir, n.slug),
    });
  }
  return out;
}

/** The nodes of ONE fork with its overrides applied — the deterministic recompute: each DISABLED function
 *  subtracts its share (ms / functionCount); disabling all functions drops the node to 0. */
function forkNodes(base: { slug: string; name: string; ms: number; fns: number }[], inst: Instance): ForkNode[] {
  return base.map((n) => {
    const disabled = inst.overrides?.[n.slug]?.disabledFunctions?.length ?? 0;
    const kept = Math.max(0, n.fns - disabled) / n.fns;
    return { slug: n.slug, name: n.name, ms: Math.round(n.ms * kept) };
  });
}

export type ScheduleNode = { name: string; startMs: number; durationMs: number; status: "done" | "running" | "pending" };
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

const parseSqlite = (s: string | null): number | null => {
  if (!s) return null;
  const t = Date.parse(s.replace(" ", "T") + "Z");
  return Number.isFinite(t) ? t : null;
};

type RunRow = { id: string; instance_id: string; started_at: string | null; finished_at: string | null; status: string; payload: string };

async function runOf(automation: string, instanceId: string): Promise<RunRow | undefined> {
  return (await db
    .prepare(`SELECT id, instance_id, started_at, finished_at, status, payload FROM automation_runs WHERE automation = ? AND instance_id = ? ORDER BY started_at DESC LIMIT 1`)
    .get(automation, instanceId)) as RunRow | undefined;
}

// A test/imitation run uses RANDOM actual durations (owner: each node pauses a random 10-20s; the OUTPUT
// node's pause = the sum of the earlier nodes). The plan (meta estDurationMs) is what the timeline drew
// BEFORE running; the actual random durations are what it runs by — so plan vs actual differ and the
// timeline visibly shifts. Stored per run in automation_runs.payload so a reload keeps the same durations.
const rnd10to20 = () => 10000 + Math.floor(Math.random() * 10001);
function genActualDurations(fnodes: ForkNode[]): Record<string, number> {
  const d: Record<string, number> = {};
  if (!fnodes.length) return d;
  let sumPrev = 0;
  fnodes.forEach((n, i) => {
    const ms = i === fnodes.length - 1 && fnodes.length >= 2 ? sumPrev : rnd10to20();
    d[n.slug] = ms;
    sumPrev += ms;
  });
  return d;
}
function payloadDurations(run: RunRow | undefined): Record<string, number> | null {
  if (!run?.payload) return null;
  try {
    const p = JSON.parse(run.payload) as { durations?: Record<string, number> };
    return p.durations && Object.keys(p.durations).length ? p.durations : null;
  } catch { return null; }
}

// ─── THE RUNNER (step 230 fix) ───────────────────────────────────────────────────────────────────────
// Idempotent: derive the run state from elapsed wall-clock time and persist it. Called on every schedule
// read, on runs/active (so the diagram lights up live), and by the cron minute tick. Ensures exactly one
// fork runs at a time and starts the next when the current finishes.
export async function advanceRuns(automation: string): Promise<void> {
  const proj = resolveProject(automation);
  if (!proj.ok) return;
  const insts = await instancesOf(proj.automation);
  if (!insts.length) return;
  const base = await nodeDurations(proj.automation);
  if (!base.length) return; // no built nodes → nothing to run
  const now = Date.now();

  // 1. progress the currently running fork (if any).
  let running = (await db
    .prepare(`SELECT id, instance_id, started_at, finished_at, status, payload FROM automation_runs WHERE automation = ? AND status = 'running' ORDER BY started_at DESC LIMIT 1`)
    .get(proj.automation)) as RunRow | undefined;

  if (running) {
    const inst = insts.find((i) => i.id === running!.instance_id);
    const planned = inst ? forkNodes(base, inst) : [];
    const actual = payloadDurations(running); // the random test durations this run uses
    const fnodes: ForkNode[] = planned.map((n) => ({ ...n, ms: actual?.[n.slug] ?? n.ms }));
    const total = fnodes.reduce((s, n) => s + n.ms, 0);
    const started = parseSqlite(running.started_at) ?? now;
    const elapsed = now - started;

    if (total <= 0 || elapsed >= total) {
      // finished — the whole fork turns green (guaranteed success).
      await db.prepare(`UPDATE automation_runs SET status = 'done', current_node = NULL, finished_at = datetime('now') WHERE id = ?`).run(running.id);
      await db.prepare(`UPDATE automation_run_nodes SET status = 'ok' WHERE run_id = ?`).run(running.id);
      running = undefined; // free the slot so the next fork can start
    } else {
      // derive per-node status from elapsed: done nodes green, the current one orange, the rest idle.
      let cum = 0;
      let current: string | null = null;
      for (const n of fnodes) {
        const st = elapsed >= cum + n.ms ? "ok" : elapsed >= cum ? "running" : "idle";
        if (st === "running") current = n.slug;
        await db.prepare(`UPDATE automation_run_nodes SET status = ? WHERE run_id = ? AND node_id = ?`).run(st, running.id, n.slug);
        cum += n.ms;
      }
      await db.prepare(`UPDATE automation_runs SET current_node = ? WHERE id = ?`).run(current, running.id);
    }
  }

  // 2. if nothing is running, start the next fork that has never run (in order).
  if (!running) {
    for (const inst of insts) {
      const existing = await runOf(proj.automation, inst.id);
      if (existing) continue; // this fork already ran (running or done)
      const fnodes = forkNodes(base, inst);
      const actual = genActualDurations(fnodes); // random 10-20s per node; output = sum of the earlier ones
      const runId = randomUUID();
      await db.prepare(
        `INSERT INTO automation_runs (id, automation, instance_id, current_node, status, payload) VALUES (?, ?, ?, ?, 'running', ?)`,
      ).run(runId, proj.automation, inst.id, fnodes[0]?.slug ?? null, JSON.stringify({ durations: actual }));
      for (let i = 0; i < fnodes.length; i++) {
        await db.prepare(`INSERT INTO automation_run_nodes (id, run_id, node_id, status) VALUES (?, ?, ?, ?)`)
          .run(randomUUID(), runId, fnodes[i].slug, i === 0 ? "running" : "idle");
      }
      break; // only one fork starts at a time
    }
  }
}

/** Per-node run status (slug → ok|running|idle) of a fork's latest run, for the timeline colors. */
async function nodeStatuses(automation: string, instanceId: string): Promise<Record<string, string>> {
  const run = await runOf(automation, instanceId);
  if (!run) return {};
  const rows = (await db.prepare(`SELECT node_id, status FROM automation_run_nodes WHERE run_id = ?`).all(run.id)) as { node_id: string; status: string }[];
  const out: Record<string, string> = {};
  for (const r of rows) out[r.node_id] = r.status;
  return out;
}

/** Recompute the schedule and return the timeline rows. Runs the derived runner first, then lays the forks
 *  out: a fork anchors on its ACTUAL start once it has run (stable — no reset on reload); a fork that has not
 *  run yet is planned after the previous one. Per-node status colors the nested bars. */
export async function recomputeSchedule(automation: string): Promise<ScheduleRow[]> {
  const proj = resolveProject(automation);
  if (!proj.ok) return [];
  await advanceRuns(proj.automation);

  const insts = await instancesOf(proj.automation);
  if (!insts.length) return [];
  const base = await nodeDurations(proj.automation);

  const now = Date.now();
  let cursor = now;
  const rows: ScheduleRow[] = [];

  for (const inst of insts) {
    const planned = forkNodes(base, inst);
    const run = await runOf(proj.automation, inst.id);
    // A fork that has started draws by its ACTUAL random durations; an un-started one by the PLAN (meta).
    const actual = payloadDurations(run);
    const fn: ForkNode[] = planned.map((n) => ({ ...n, ms: actual?.[n.slug] ?? n.ms }));
    const plannedDurationMs = fn.reduce((s, n) => s + n.ms, 0);
    const startMs = parseSqlite(run?.started_at ?? null);
    const endMs = parseSqlite(run?.finished_at ?? null);
    const status = run?.status === "done" ? "done" : run?.status === "running" ? "running" : "scheduled";
    const nStatus = await nodeStatuses(proj.automation, inst.id);

    // Anchor: a started fork on its actual start; an un-started one after the previous fork's end.
    const anchor = startMs ?? cursor;
    let nc = anchor;
    const nodes: ScheduleNode[] = fn.map((n) => {
      const s = nc; nc += n.ms;
      const raw = nStatus[n.slug];
      const st = raw === "ok" ? "done" : raw === "running" ? "running" : "pending";
      return { name: n.name, startMs: s, durationMs: n.ms, status: st as ScheduleNode["status"] };
    });

    rows.push({
      instanceId: inst.id, title: inst.title, ord: inst.ord,
      plannedStart: anchor, plannedDurationMs,
      actualStart: startMs, actualEnd: endMs, status, nodes,
    });

    cursor = endMs ?? (anchor + plannedDurationMs);

    await db.prepare(
      `INSERT INTO automation_schedule (instance_id, automation, ord, planned_start, planned_duration_ms, actual_start, actual_end, status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(instance_id) DO UPDATE SET
         ord = excluded.ord, planned_start = excluded.planned_start, planned_duration_ms = excluded.planned_duration_ms,
         actual_start = excluded.actual_start, actual_end = excluded.actual_end, status = excluded.status, updated_at = datetime('now')`,
    ).run(
      inst.id, proj.automation, inst.ord, new Date(anchor).toISOString(), plannedDurationMs,
      startMs ? new Date(startMs).toISOString() : null, endMs ? new Date(endMs).toISOString() : null, status,
    );
  }

  rows.sort((a, b) => a.plannedStart - b.plannedStart);
  return rows;
}

/** Every automation that has at least one fork — the set the cron tick recomputes. */
export async function automationsWithForks(): Promise<string[]> {
  const rows = (await db.prepare(`SELECT DISTINCT automation FROM automation_instances`).all()) as { automation: string }[];
  return rows.map((r) => r.automation);
}
