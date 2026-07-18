import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject, nodeByCuid, patchNode, softDeleteNode } from "@/lib/nodes";

// Edit or delete a node (step 224 L3) — thin wrappers since step 250: the write paths live in
// patchNode / softDeleteNode (lib/nodes.ts), shared with the in-product develop agent's tool executor.
// PATCH writes the panel edits (spec.md / instruction.ts / meta fields / name); an OWNER editing a live
// node's instruction stages an optimization request (stage:true — the step-240 wave semantics). DELETE is
// a soft delete: tombstoned row, purged edges, removed folder, regenerated diagram.
export const runtime = "nodejs";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const row = await nodeByCuid(cuid);
  if (!row) return NextResponse.json({ error: "node not found" }, { status: 404 });
  const proj = resolveProject(row.automation);
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as {
    spec?: string; instruction?: string; name?: string;
    /** The Builder type editor (owner 2026-07-16): a draft's role and its per-role type (ioType — for an
     *  intermediate node "transform" | "condition" | custom; for input/output a channel/surface key or a
     *  custom name like "WhatsApp"). Written into the node's own meta.ts, the authored home of both. */
    role?: string; ioType?: string;
    /** Edge mode (owner 2026-07-16): rewire this node's PARENT — the diagram edge parent→node. A string
     *  cuid connects, an explicit null disconnects (deletes the edge). Live truth = the index column;
     *  meta.ts parentId is kept in sync as the seed-time fallback. */
    parentCuid?: string | null;
  };

  const res = await patchNode(proj, row, body, true);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const row = await nodeByCuid(cuid);
  if (!row) return NextResponse.json({ error: "node not found" }, { status: 404 });
  const proj = resolveProject(row.automation);
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  await softDeleteNode(proj, row);
  return NextResponse.json({ ok: true });
}
