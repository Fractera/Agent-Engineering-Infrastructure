import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { buildProjection } from "@/lib/projection";

// THE PROJECTION ROUTE (step 254.13) — POST {automation} builds the agent's sterile room (the route's
// essence in <repo>/agent-rooms/<cat>/<slug>/, deterministic rebuild) and returns its manifest
// (root, files, bytes, ~tokens). The hand-off (254.15) points the external agent at this room.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const result = await buildProjection(String(body?.automation ?? "").trim());
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
