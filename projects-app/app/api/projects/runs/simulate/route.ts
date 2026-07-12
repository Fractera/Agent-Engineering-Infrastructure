import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSession } from "@/lib/auth/get-session";
import { db } from "@/lib/db";
import { recomputeSchedule } from "@/lib/schedule";

// TEMPORARY demonstrator (step 223.C.3) — steps a run's current_node through the Master's nodes so the
// canvas's active-node ORANGE highlight is visible BEFORE real execution exists (real execution is
// 223.C.6, which replaces this trigger with the node functions actually running). Architect/manager
// gated (the whole /projects zone is). On first call it STARTS a run (first node running); each next
// call ADVANCES (marks the current node ok, moves to the next); past the last node it FINISHES.
export const runtime = "nodejs";

const ROLES = ["architect", "manager", "agent"];

type RunRow = { id: string; current_node: string | null };

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let body: { automation?: string; nodeIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const automation = (body.automation ?? "").trim();
  const nodeIds = Array.isArray(body.nodeIds) ? body.nodeIds.filter((n) => typeof n === "string") : [];
  if (!automation || nodeIds.length === 0) {
    return NextResponse.json({ error: "automation and nodeIds are required" }, { status: 400 });
  }

  const active = (await db
    .prepare(
      `SELECT id, current_node FROM automation_runs
       WHERE automation = ? AND status = 'running' ORDER BY started_at DESC LIMIT 1`,
    )
    .get(automation)) as RunRow | undefined;

  // START — no active run: create one, first node running, the rest idle.
  if (!active) {
    const runId = randomUUID();
    await db
      .prepare(
        `INSERT INTO automation_runs (id, automation, current_node, status) VALUES (?, ?, ?, 'running')`,
      )
      .run(runId, automation, nodeIds[0]);
    for (let i = 0; i < nodeIds.length; i++) {
      await db
        .prepare(`INSERT INTO automation_run_nodes (id, run_id, node_id, status) VALUES (?, ?, ?, ?)`)
        .run(randomUUID(), runId, nodeIds[i], i === 0 ? "running" : "idle");
    }
    return NextResponse.json({ runId, current_node: nodeIds[0], status: "running" });
  }

  // ADVANCE — mark the current node ok, move to the next (or finish).
  const cur = active.current_node;
  const idx = cur ? nodeIds.indexOf(cur) : -1;
  if (cur) {
    await db
      .prepare(`UPDATE automation_run_nodes SET status = 'ok' WHERE run_id = ? AND node_id = ?`)
      .run(active.id, cur);
  }
  const next = idx >= 0 && idx + 1 < nodeIds.length ? nodeIds[idx + 1] : null;
  if (next) {
    await db
      .prepare(`UPDATE automation_run_nodes SET status = 'running' WHERE run_id = ? AND node_id = ?`)
      .run(active.id, next);
    await db.prepare(`UPDATE automation_runs SET current_node = ? WHERE id = ?`).run(next, active.id);
    return NextResponse.json({ runId: active.id, current_node: next, status: "running" });
  }
  // No next node — finish the run.
  await db
    .prepare(
      `UPDATE automation_runs SET status = 'done', current_node = NULL, finished_at = datetime('now') WHERE id = ?`,
    )
    .run(active.id);
  // A finished run is a FACT that shifts the Gantt timeline (step 230): recompute so the next fork's planned
  // start moves to reflect that this one ended (earlier or later than planned). Best-effort.
  try { await recomputeSchedule(automation); } catch { /* the run is already finished; the tick will catch up */ }
  return NextResponse.json({ runId: active.id, current_node: null, status: "done" });
}
