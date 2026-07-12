import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { edgeByCuid, readEdgeFiles } from "@/lib/edges";
import { materializeEdgeStep, nextStepNumber } from "@/lib/dev-steps";

// "Start development" for a LINK (step 225) — the same handoff as a node's (224 L6): it materializes a
// development step FILE into the product's own queue (DEVELOPMENT-STEPS/NEW-STEPS/, read by
// :3002/service/development-steps and by the full-auto agent) and returns the copy-paste brief. The link is
// built like any node — only its code lives in _edges/<cuid>/ and belongs to no project.
export const runtime = "nodejs";

export async function POST(req: NextRequest, ctx: { params: Promise<{ cuid: string }> }) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { cuid } = await ctx.params;
  const edge = await edgeByCuid(cuid);
  if (!edge) return NextResponse.json({ error: "edge not found" }, { status: 404 });

  const files = await readEdgeFiles(cuid);
  const number = await nextStepNumber();
  const { file, message } = await materializeEdgeStep({
    number,
    edgeCuid: cuid,
    name: edge.name,
    from: edge.from_automation,
    to: edge.to_automation,
    fromNode: edge.from_node_cuid,
    toNode: edge.to_node_cuid,
    spec: files.spec,
    targetVersion: edge.latest_version + 1,
  });

  return NextResponse.json({ ok: true, number, file, message });
}
