import { NextRequest, NextResponse } from "next/server";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { createNodeId } from "@/lib/cuid";
import { db } from "@/lib/db";
import {
  authorize, resolveProject, nodeByCuid, readNodeFiles, functionsAreEmpty, stripDraftFlag,
  regenerateDiagram, liveSlugsInOrder, scheduleRebuild,
} from "@/lib/nodes";

// Materialize a node (step 224 L3b) — the coder calls this as the mandatory closing step of a development
// step, AFTER it has written the real functions.ts (+ instruction.ts). It: (1) requires non-empty
// functions; (2) strips the draft flag from meta.ts and drops spec.md (so the validator sees a materialized
// node); (3) records a FULL snapshot in automation_node_versions; (4) sets latest_version = active_version =
// new version; (5) regenerates _data/diagram.ts and schedules a rebuild so the new code goes live. This is
// what turns a red draft into a versioned, working node.
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

  const materializedMeta = stripDraftFlag(files.meta);
  await writeFile(join(nodeDir, "meta.ts"), materializedMeta, "utf8");
  if (files.spec) await rm(join(nodeDir, "spec.md"), { force: true });

  const version = row.latest_version + 1;
  await db.prepare(
    `INSERT INTO automation_node_versions
     (id, automation, node_cuid, version, meta_json, functions_src, instruction_src, spec_src, summary, dev_step_ref)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(createNodeId(), row.automation, cuid, version, materializedMeta, files.functions, files.instruction, files.spec, summary, devStepRef);

  await db.prepare(
    `UPDATE automation_nodes SET draft = 0, status = 'materialized', latest_version = ?, active_version = ?, updated_at = datetime('now') WHERE cuid = ?`,
  ).run(version, version, cuid);

  await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(row.automation));
  scheduleRebuild();
  return NextResponse.json({ ok: true, cuid, version, building: true });
}
