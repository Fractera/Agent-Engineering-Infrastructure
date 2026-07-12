import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { createEdge, edgeAllowed, listEdges } from "@/lib/edges";

// The global canvas's edges (step 225). GET returns every live edge (the canvas draws them). POST creates
// one — but ONLY through THE READINESS GATE: both endpoint automations must have finished development (no
// draft nodes). A refused edge returns 409 with the reason, and the canvas shows it as a red dashed line
// that explains itself on click. This is the step's central rule: an edge always changes its endpoint
// nodes, so they must be built first.
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

  const gate = await edgeAllowed(from.automation, to.automation);
  if (!gate.allowed) {
    return NextResponse.json(
      { error: gate.message, gate: { from: gate.from, to: gate.to }, blocked: true },
      { status: 409 },
    );
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
