import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { listVersionsByRef } from "@/lib/entity-store";

// A node's version history (step 224 L3b) — the LIGHT list (no snapshot bodies), newest first. The full
// snapshot of one version is GET .../versions/<n>. History is cold storage: fetched on demand for the
// version panel / rollback / future AI mining, never loaded by the canvas. Reads from the GENERIC
// entity_history table (step 238 Phase 1) via listVersionsByRef.
export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const rows = await listVersionsByRef("node", cuid);
  const versions = rows.map((r) => {
    const p = r.payload as { summary?: string };
    return { version: r.version, summary: p.summary ?? "", dev_step_ref: r.devStepRef, created_at: r.createdAt };
  });
  return NextResponse.json({ versions });
}
