import { NextRequest, NextResponse } from "next/server";
import { materializeNode } from "@/lib/node-materialize";
import { authorize, resolveProject, nodeByCuid } from "@/lib/nodes";

// Materialize a node (step 224 L3b) — a thin wrapper since step 250: the whole close path lives in
// materializeNode (lib/node-materialize.ts), shared with the in-product develop agent's tool executor.
// Compile FIRST (a node that does not bundle is refused with the compiler's own error text, nothing
// mutated), then draft strip, version snapshot, index flip, per-object closure (step 249), diagram regen.
// NO REBUILD: the executor imports the compiled artifact from disk, so the code is live on return.
export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const row = await nodeByCuid(cuid);
  if (!row) return NextResponse.json({ error: "node not found" }, { status: 404 });
  const proj = resolveProject(row.automation);
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { summary?: string; devStepRef?: string };
  const res = await materializeNode(
    proj, row, String(body?.summary ?? "").trim(), body?.devStepRef ? String(body.devStepRef) : null,
  );
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json(res);
}
