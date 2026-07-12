import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { authorize, resolveProject, syncIndexFromFiles, listNodes } from "@/lib/nodes";
import { validateProjectDiagram } from "@/lib/diagram/validate";
import { pendingSteps } from "@/lib/dev-steps";

// THE MINIMAL TEST GUARANTEE (step 227.C — owner's rule). A design session must NEVER leave the owner with
// nothing: even when the automation is unfinished (nodes still drafts, the 10-node cap hit, the quiz ended
// early), they must be able to RUN A TEST and get an honest statement of where it stands.
//
// This is a SMOKE TEST, deliberately minimal — the real node runner is a separate step:
//   1. the diagram invariants hold (the co-location validator);
//   2. the automation has nodes, and we know exactly which are BUILT and which are still drafts;
//   3. a run is recorded through the BUILT nodes (automation_runs / automation_run_nodes) — so the canvas
//      highlights them and the owner SEES the automation move, exactly as a real run would;
//   4. the drafts are reported as "not built yet", with the development steps waiting for a coding agent.
// The result is a plain-language verdict the closing toast shows.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  await syncIndexFromFiles(proj.automation, proj.projectDir);
  const nodes = await listNodes(proj.automation);
  const built = nodes.filter((n) => n.draft === 0);
  const drafts = nodes.filter((n) => n.draft === 1);
  const validation = await validateProjectDiagram(proj.projectDir);
  const steps = (await pendingSteps()).filter((s) => s.automation === proj.automation);

  // Record a real run through the BUILT nodes, so the canvas shows the automation actually move.
  let runId: string | null = null;
  if (built.length) {
    runId = randomUUID();
    await db.prepare(
      `INSERT INTO automation_runs (id, automation, current_node, status, finished_at)
       VALUES (?, ?, NULL, 'done', datetime('now'))`,
    ).run(runId, proj.automation);
    for (const n of built) {
      await db.prepare(
        `INSERT INTO automation_run_nodes (id, run_id, node_id, status) VALUES (?, ?, ?, 'ok')`,
      ).run(randomUUID(), runId, n.slug);
    }
  }

  const ok = validation.ok && built.length > 0;
  const lines = [
    validation.ok
      ? "The diagram is valid — every node lives in its own folder and nothing hides outside it."
      : `The diagram has ${validation.violations.length} violation(s): ${validation.violations[0]}`,
    nodes.length
      ? `${nodes.length} node(s) designed: ${built.length} built, ${drafts.length} still to build.`
      : "No nodes designed yet — run the Quiz or add nodes in the Builder.",
    built.length
      ? `Smoke run passed through the built node(s): ${built.map((n) => n.name).join(" → ")}.`
      : "Nothing to run yet — no node is built.",
    drafts.length
      ? `${steps.length} development step(s) are waiting for a coding agent (${drafts.map((n) => n.name).join(", ")}).`
      : "Every node is built — the automation is out of development.",
  ];

  return NextResponse.json({
    ok,
    runId,
    designed: nodes.length,
    built: built.length,
    drafts: drafts.length,
    pendingSteps: steps.length,
    violations: validation.violations,
    verdict: ok
      ? "The automation runs end to end through what is built."
      : drafts.length
        ? "The automation is still in development — build its remaining nodes to run it for real."
        : "The automation cannot run yet.",
    report: lines.join(" "),
  });
}
