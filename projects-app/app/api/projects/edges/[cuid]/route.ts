import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/nodes";
import { edgeByCuid, readEdgeFiles, removeEdge, writeEdgeSpec } from "@/lib/edges";

// One edge (step 225): GET reads it with its co-located sources (the panel edits the spec and picks the
// endpoint NODES — an edge may join ANY node of X to ANY node of Y, not only leaves or parents/children).
// PATCH saves the panel (spec + the chosen endpoint nodes + name). DELETE removes it (soft in the index,
// the folder is gone).
export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const edge = await edgeByCuid(cuid);
  if (!edge) return NextResponse.json({ error: "edge not found" }, { status: 404 });
  const files = await readEdgeFiles(cuid);
  return NextResponse.json({ edge, spec: files.spec });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const edge = await edgeByCuid(cuid);
  if (!edge) return NextResponse.json({ error: "edge not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as
    { spec?: string; name?: string; fromNodeCuid?: string | null; toNodeCuid?: string | null };

  if (typeof body.spec === "string") await writeEdgeSpec(cuid, body.spec);
  await db.prepare(
    `UPDATE automation_edges SET
       name = COALESCE(?, name),
       from_node_cuid = COALESCE(?, from_node_cuid),
       to_node_cuid = COALESCE(?, to_node_cuid),
       updated_at = datetime('now')
     WHERE cuid = ?`,
  ).run(body.name ?? null, body.fromNodeCuid ?? null, body.toNodeCuid ?? null, cuid);

  return NextResponse.json({ ok: true, edge: await edgeByCuid(cuid) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  if (!(await edgeByCuid(cuid))) return NextResponse.json({ error: "edge not found" }, { status: 404 });
  await removeEdge(cuid);
  return NextResponse.json({ ok: true });
}
