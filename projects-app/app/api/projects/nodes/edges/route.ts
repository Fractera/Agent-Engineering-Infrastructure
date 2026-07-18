import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject, writeDiagramEdge } from "@/lib/nodes";

// DIAGRAM EDGE operations (owner 2026-07-16, the fan-in fix) — a thin wrapper since step 250: the write
// path lives in writeDiagramEdge (lib/nodes.ts), shared with the in-product develop agent's tool executor.
// Edges are their own many-to-many list; DELIBERATELY NO validation beyond self-loop (the owner's explicit
// ruling). POST {automation, fromCuid, toCuid} connects; {…, remove:true} disconnects.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as {
    automation?: string; fromCuid?: string; toCuid?: string; remove?: boolean;
  };
  const proj = resolveProject(String(body.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const res = await writeDiagramEdge(
    proj.automation, String(body.fromCuid ?? ""), String(body.toCuid ?? ""), Boolean(body.remove),
  );
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json(body.remove ? { ok: true, removed: true } : { ok: true });
}
