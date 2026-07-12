import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { validateEdges } from "@/lib/diagram/validate";
import { edgesRoot, listEdges } from "@/lib/edges";

// Validate the GLOBAL graph's invariants (step 225) — the mirror of /api/projects/validate, one level up:
// every _edges/<cuid>/ folder must be a live edge of the canvas (no orphan links left behind by a deleted
// project), hold only the allowed files, and respect the draft/materialized contract.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const live = (await listEdges()).map((e) => e.cuid);
  return NextResponse.json(await validateEdges(edgesRoot(), live));
}
