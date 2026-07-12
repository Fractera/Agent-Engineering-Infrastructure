import { NextRequest, NextResponse } from "next/server";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import {
  authorize, resolveProject, nodeByCuid, regenerateDiagram, liveSlugsInOrder, scheduleRebuild,
} from "@/lib/nodes";

// Roll a node back to an earlier version (step 224 L3b) — restore the files from that version's snapshot and
// set active_version (latest_version is unchanged, so history is preserved). Used to return to a more
// effective earlier version. Regenerates the diagram and schedules a rebuild so the restored code goes live.
export const runtime = "nodejs";

type Snap = { meta_json: string; functions_src: string; instruction_src: string };

export async function POST(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const row = await nodeByCuid(cuid);
  if (!row) return NextResponse.json({ error: "node not found" }, { status: 404 });
  const proj = resolveProject(row.automation);
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { version?: number };
  const version = Number(body?.version);
  const snap = (await db
    .prepare(`SELECT meta_json, functions_src, instruction_src FROM automation_node_versions WHERE node_cuid = ? AND version = ?`)
    .get(cuid, version)) as Snap | undefined;
  if (!snap) return NextResponse.json({ error: "version not found" }, { status: 404 });

  const nodeDir = join(proj.projectDir, "_nodes", row.slug);
  await writeFile(join(nodeDir, "meta.ts"), snap.meta_json, "utf8");
  await writeFile(join(nodeDir, "functions.ts"), snap.functions_src, "utf8");
  if (snap.instruction_src.trim()) await writeFile(join(nodeDir, "instruction.ts"), snap.instruction_src, "utf8");
  else await rm(join(nodeDir, "instruction.ts"), { force: true });

  await db.prepare(
    `UPDATE automation_nodes SET draft = 0, status = 'materialized', active_version = ?, updated_at = datetime('now') WHERE cuid = ?`,
  ).run(version, cuid);

  await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(row.automation));
  scheduleRebuild();
  return NextResponse.json({ ok: true, cuid, active_version: version });
}
