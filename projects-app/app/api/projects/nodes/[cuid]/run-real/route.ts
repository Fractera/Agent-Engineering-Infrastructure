import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { authorize, nodeByCuid } from "@/lib/nodes";
import { searchSources, dedupeSources } from "@/app/(projects)/projects/other/example-content-pipeline/_nodes/find-sources/functions";

// PHASE 3 PROOF (step 238) — the `_nodes/` standard (steps 223-232, everything step 238's transport+history
// work sits on) had ZERO proven working examples anywhere: `NodeFunction` carries only a typed SIGNATURE,
// never a body, and the one "reference example" (example-content-pipeline) was itself pure stubs. This
// route is the deliberately SMALLEST possible slice proving the convention produces genuinely EXECUTING
// code: a plain, statically-imported, Next.js-compiled function — no eval, no stored code string — actually
// gets CALLED, and its REAL return value is recorded, unlike test-run's pure timing/status SIMULATION
// (step 227.C, which marks every built node 'ok' without invoking anything).
//
// Deliberately narrow: proven for find-sources' one cuid only. A general "run ANY node by cuid" executor
// (dynamic import by resolved file path, branching/parallel `run` mode, retries) is explicitly OUT OF SCOPE
// here — a separate, later step once this convention is proven. Telegram-notes' execution model
// (`_workflow/definition.ts`, WDK) is NOT the pattern being proven or extended here — see the hard
// constraint in memory (feedback-telegram-notes-logic-source-only): it is a historical artifact, logic
// source only, never an architecture to build toward.
export const runtime = "nodejs";

const PROOF_NODE_CUID = "cxa1findsources0baselinev1"; // find-sources' cuid — see its meta.ts

export async function POST(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  if (cuid !== PROOF_NODE_CUID) {
    return NextResponse.json(
      { error: "run-real proves ONE node only (find-sources) for now — a general executor is a later step" },
      { status: 400 },
    );
  }
  const row = await nodeByCuid(cuid);
  if (!row) return NextResponse.json({ error: "node not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { topic?: string; count?: number };
  const topic = String(body.topic ?? "cats");
  const count = Number.isFinite(body.count) ? Number(body.count) : 5;

  // The REAL call — searchSources/dedupeSources are plain exported async functions in the node's own
  // functions.ts, compiled normally by Next.js. No eval, no dynamic codegen.
  const found = await searchSources(topic, count);
  const result = await dedupeSources(found);

  const runId = randomUUID();
  await db.prepare(
    `INSERT INTO automation_runs (id, automation, current_node, status, finished_at)
     VALUES (?, ?, ?, 'done', datetime('now'))`,
  ).run(runId, row.automation, row.slug);
  await db.prepare(
    `INSERT INTO automation_run_nodes (id, run_id, node_id, status, payload) VALUES (?, ?, ?, 'ok', ?)`,
  ).run(randomUUID(), runId, row.slug, JSON.stringify({ real: true, input: { topic, count }, result }));

  return NextResponse.json({ ok: true, real: true, runId, input: { topic, count }, result });
}
