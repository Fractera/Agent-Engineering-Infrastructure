import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { getVersionByRef } from "@/lib/entity-architecture";

// The full snapshot of one node version (step 224 L3b) — meta/functions/instruction/spec sources, for the
// version panel or an inspection before a rollback. Cold: fetched only on demand. Reads from the GENERIC
// entity_history table (step 238 Phase 1) via getVersionByRef.
export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ cuid: string; version: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid, version } = await ctx.params;
  const record = await getVersionByRef("node", cuid, Number(version));
  if (!record) return NextResponse.json({ error: "version not found" }, { status: 404 });
  const p = record.payload as { metaJson?: string; functionsSrc?: string; instructionSrc?: string; specSrc?: string; summary?: string };
  return NextResponse.json({
    version: {
      version: Number(version),
      meta_json: p.metaJson ?? "", functions_src: p.functionsSrc ?? "", instruction_src: p.instructionSrc ?? "",
      spec_src: p.specSrc ?? "", summary: p.summary ?? "",
      dev_step_ref: record.devStepRef, created_at: record.createdAt,
    },
  });
}
