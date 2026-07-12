import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/nodes";

// A node's version history (step 224 L3b) — the LIGHT list (no snapshot bodies), newest first. The full
// snapshot of one version is GET .../versions/<n>. History is cold storage: fetched on demand for the
// version panel / rollback / future AI mining, never loaded by the canvas.
export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const versions = await db
    .prepare(
      `SELECT version, summary, dev_step_ref, created_at FROM automation_node_versions
       WHERE node_cuid = ? ORDER BY version DESC`,
    )
    .all(cuid);
  return NextResponse.json({ versions });
}
