import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject, saveNodeLayout } from "@/lib/nodes";

// Save canvas node positions (step 224 L3). The Builder posts the current x/y of each node when the owner
// arranges them (or after auto-layout) and on closing Builder, so the canvas shows the same layout next
// time. Layout now lives in _data/graph.json together with the rest of the structure — one file, one truth
// (the file-system refactor, owner 2026-07-20); it used to be a column on the automation_nodes index.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; positions?: { cuid?: string; x?: number; y?: number }[] }
    | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const positions = (Array.isArray(body?.positions) ? body.positions : [])
    .filter((p): p is { cuid: string; x?: number; y?: number } => typeof p?.cuid === "string")
    .map((p) => ({ cuid: p.cuid, x: Number(p.x) || 0, y: Number(p.y) || 0 }));
  const saved = await saveNodeLayout(proj.automation, positions);
  return NextResponse.json({ ok: true, saved });
}
