import { NextRequest, NextResponse } from "next/server";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { completeStep } from "@/lib/dev-steps";
import { db } from "@/lib/db";
import { writeVersionByRef, archiveAndClearTransport, setLifecycleState } from "@/lib/entity-store";
import { compileNode } from "@/lib/node-compile";
import {
  authorize, resolveProject, nodeByCuid, readNodeFiles, functionsAreEmpty, stripDraftFlag,
  regenerateDiagram, liveSlugsInOrder,
} from "@/lib/nodes";

// Materialize a node (step 224 L3b) — the coder calls this as the mandatory closing step, AFTER it has
// written the real functions.ts (+ instruction.ts). It: (1) requires non-empty functions; (2) COMPILES the
// node's runtime artifact (step 249 — functions.compiled.mjs; a node that does not compile is refused HERE,
// with the compiler's own error text, and nothing is mutated); (3) strips the draft flag from meta.ts and
// drops spec.md; (4) records a FULL snapshot in entity_history; (5) sets latest_version = active_version;
// (6) archives + clears the node's own brief (rawRequest → history) and asserts the lifecycle flag — the
// PER-OBJECT closure that replaced the wave's global complete in the light hand-off flow (step 249);
// (7) regenerates _data/diagram.ts. NO REBUILD: the executor imports the compiled artifact from disk, so
// the new code is live the moment this returns.
export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const row = await nodeByCuid(cuid);
  if (!row) return NextResponse.json({ error: "node not found" }, { status: 404 });
  const proj = resolveProject(row.automation);
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { summary?: string; devStepRef?: string };
  const summary = String(body?.summary ?? "").trim();
  const devStepRef = body?.devStepRef ? String(body.devStepRef) : null;

  const nodeDir = join(proj.projectDir, "_nodes", row.slug);
  const files = await readNodeFiles(proj.projectDir, row.slug);
  if (functionsAreEmpty(files.functions)) {
    return NextResponse.json({ error: "cannot materialize: functions.ts is empty — write the node's functions first" }, { status: 400 });
  }

  // COMPILE FIRST (step 249): the runtime artifact is what the executor will actually run — a node whose
  // source does not bundle is refused before any state changes, with the compiler's error for the agent.
  const compiled = await compileNode(proj.projectDir, row.slug);
  if (!compiled.ok) {
    return NextResponse.json({ error: `cannot materialize: functions.ts does not compile:\n${compiled.error}` }, { status: 400 });
  }

  const materializedMeta = stripDraftFlag(files.meta);
  await writeFile(join(nodeDir, "meta.ts"), materializedMeta, "utf8");
  if (files.spec) await rm(join(nodeDir, "spec.md"), { force: true });

  const version = row.latest_version + 1;
  await writeVersionByRef(row.automation, "node", cuid, version, {
    metaJson: materializedMeta, functionsSrc: files.functions, instructionSrc: files.instruction,
    specSrc: files.spec, summary,
  }, devStepRef);

  await db.prepare(
    `UPDATE automation_nodes SET draft = 0, status = 'materialized', latest_version = ?, active_version = ?, updated_at = datetime('now') WHERE cuid = ?`,
  ).run(version, version, cuid);

  // Close the development step that produced this version — the file moves NEW-STEPS/ -> COMPLETED-STEPS/
  // with status=completed (step 224 L7). This is what keeps the queue honest: a built node never leaves a
  // pending step behind, so the full-auto agent always sees only real work.
  let completed: string | null = null;
  if (devStepRef) completed = await completeStep(Number(devStepRef), summary);

  // PER-OBJECT CLOSURE (step 249): finishing the node IS what clears its brief — the pending rawRequest is
  // archived into entity_history and the container emptied, with no global wave-complete required. And a
  // node REALLY landing is the order-proof evidence the lifecycle flag was always looking for.
  await archiveAndClearTransport(row.automation, "node", cuid, devStepRef ?? undefined);
  await setLifecycleState(row.automation, "real-automation");

  await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(row.automation));
  // NO scheduleRebuild (step 249): the compiled artifact above IS the live code — the executor imports it
  // from disk, so the node works the moment this response returns.
  return NextResponse.json({ ok: true, cuid, version, live: true, compiled: compiled.file, completedStep: completed });
}
