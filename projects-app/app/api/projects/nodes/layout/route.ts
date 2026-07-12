import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize, resolveProject } from "@/lib/nodes";

// Save canvas node positions (step 224 L3). The Builder posts the current x/y of each node when the owner
// arranges them (or after auto-layout) and on closing Builder, so the canvas shows the same layout next
// time. Layout is view state — it lives in the index (automation_nodes), never in the files.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; positions?: { cuid?: string; x?: number; y?: number }[] }
    | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const positions = Array.isArray(body?.positions) ? body.positions : [];
  let saved = 0;
  for (const p of positions) {
    if (typeof p?.cuid !== "string") continue;
    await db.prepare(
      `UPDATE automation_nodes SET x = ?, y = ?, updated_at = datetime('now') WHERE cuid = ? AND automation = ?`,
    ).run(Number(p.x) || 0, Number(p.y) || 0, p.cuid, proj.automation);
    saved++;
  }
  return NextResponse.json({ ok: true, saved });
}
