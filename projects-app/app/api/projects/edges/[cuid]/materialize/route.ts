import { NextRequest, NextResponse } from "next/server";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { authorize } from "@/lib/nodes";
import { completeStep } from "@/lib/dev-steps";
import { edgeByCuid, edgesRoot, patchEdge, readEdgeFiles } from "@/lib/edges";
import { scheduleRebuild } from "@/lib/nodes";
import { writeVersionByRef } from "@/lib/entity-store";

// Materialize a LINK (step 225) — the coder's mandatory closing call, mirroring a node's materialize
// (224 L3b): it requires real integration code, drops the draft flag, records a FULL version snapshot in
// entity_history (step 238 Phase 2 — the generic table, entity_type "edge"; an edge belongs to no single
// automation, so its rows use automation:'' by convention), closes the development step (the file moves to
// COMPLETED-STEPS/) and schedules the rebuild. Once no draft link is left, the global automation leaves
// "In development" and can be switched on.
export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const edge = await edgeByCuid(cuid);
  if (!edge) return NextResponse.json({ error: "edge not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { summary?: string; devStepRef?: string };
  const summary = String(body?.summary ?? "").trim();
  const devStepRef = body?.devStepRef ? String(body.devStepRef) : null;

  const files = await readEdgeFiles(cuid);
  const empty = files.functions.trim() === "" || /FUNCTIONS[^=]*=\s*\[\s*\]/.test(files.functions);
  if (empty) {
    return NextResponse.json(
      { error: "cannot materialize: _edges/<cuid>/functions.ts is empty — write the integration first" },
      { status: 400 },
    );
  }

  if (files.spec) await rm(join(edgesRoot(), cuid, "spec.md"), { force: true });

  const version = edge.latest_version + 1;
  await writeVersionByRef("", "edge", cuid, version, {
    metaJson: files.meta, functionsSrc: files.functions, specSrc: files.spec, summary,
  }, devStepRef);

  await patchEdge(cuid, { draft: false, status: "materialized", latestVersion: version, activeVersion: version });

  let completed: string | null = null;
  if (devStepRef) completed = await completeStep(Number(devStepRef), summary);

  scheduleRebuild();
  return NextResponse.json({ ok: true, cuid, version, completedStep: completed, building: true });
}
