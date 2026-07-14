import { NextRequest, NextResponse } from "next/server";
import { writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { getVersionByRef } from "@/lib/entity-store";
import {
  authorize, resolveProject, nodeByCuid, regenerateDiagram, liveSlugsInOrder, scheduleRebuild,
} from "@/lib/nodes";

// Roll a node back to an earlier version (step 224 L3b) — restore the files from that version's snapshot and
// set active_version (latest_version is unchanged, so history is preserved). Used to return to a more
// effective earlier version. Regenerates the diagram and schedules a rebuild so the restored code goes live.
// Reads from the GENERIC entity_history table (step 238 Phase 1) via getVersionByRef.
export const runtime = "nodejs";

type Snap = { metaJson: string; functionsSrc: string; instructionSrc: string };

export async function POST(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const row = await nodeByCuid(cuid);
  if (!row) return NextResponse.json({ error: "node not found" }, { status: 404 });
  const proj = resolveProject(row.automation);
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { version?: number };
  const version = Number(body?.version);
  const record = await getVersionByRef("node", cuid, version);
  if (!record) return NextResponse.json({ error: "version not found" }, { status: 404 });
  const snap = record.payload as Snap;

  const nodeDir = join(proj.projectDir, "_nodes", row.slug);
  await writeFile(join(nodeDir, "meta.ts"), snap.metaJson, "utf8");
  await writeFile(join(nodeDir, "functions.ts"), snap.functionsSrc, "utf8");
  if (snap.instructionSrc?.trim()) await writeFile(join(nodeDir, "instruction.ts"), snap.instructionSrc, "utf8");
  else await rm(join(nodeDir, "instruction.ts"), { force: true });

  await db.prepare(
    `UPDATE automation_nodes SET draft = 0, status = 'materialized', active_version = ?, updated_at = datetime('now') WHERE cuid = ?`,
  ).run(version, cuid);

  await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(row.automation));
  scheduleRebuild();
  return NextResponse.json({ ok: true, cuid, active_version: version });
}
