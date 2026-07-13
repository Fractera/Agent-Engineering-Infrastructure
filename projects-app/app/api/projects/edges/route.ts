import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { createEdge, listEdges, sameGroup } from "@/lib/edges";

// The global canvas's edges (step 225). GET returns every live edge (the canvas draws them).
//
// THE CONNECTION RULE (step 236.3, replaces both the old readiness gate AND the inverted nesting gate): a
// custom edge may be created ONLY between two automations that are members of the SAME group — a group's
// members ARE the chain, edges are how that chain gets defined. Draft/readiness state no longer matters at
// all. A refused edge returns 409 with a STABLE CODE (never English prose — the client owns the translated
// copy, rule 4г) and the canvas shows it as a red dashed line that explains itself on click.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ edges: await listEdges() });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { from?: string; to?: string; name?: string; spec?: string; fromNodeCuid?: string; toNodeCuid?: string }
    | null;
  const from = resolveProject(String(body?.from ?? ""));
  const to = resolveProject(String(body?.to ?? ""));
  if (!from.ok || !to.ok) return NextResponse.json({ error: "from and to must be category/slug" }, { status: 400 });
  if (from.automation === to.automation) {
    return NextResponse.json({ error: "an edge connects two DIFFERENT automations" }, { status: 400 });
  }

  const gate = await sameGroup(from.automation, to.automation);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.code, blocked: true }, { status: 409 });
  }

  const edge = await createEdge({
    from: from.automation,
    to: to.automation,
    name: body?.name,
    spec: body?.spec,
    fromNodeCuid: body?.fromNodeCuid ?? null,
    toNodeCuid: body?.toNodeCuid ?? null,
  });
  return NextResponse.json({ ok: true, edge });
}
