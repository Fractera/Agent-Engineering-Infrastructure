import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/nodes";

// The full snapshot of one node version (step 224 L3b) — meta/functions/instruction/spec sources, for the
// version panel or an inspection before a rollback. Cold: fetched only on demand.
export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ cuid: string; version: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid, version } = await ctx.params;
  const snap = await db
    .prepare(`SELECT * FROM automation_node_versions WHERE node_cuid = ? AND version = ?`)
    .get(cuid, Number(version));
  if (!snap) return NextResponse.json({ error: "version not found" }, { status: 404 });
  return NextResponse.json({ version: snap });
}
