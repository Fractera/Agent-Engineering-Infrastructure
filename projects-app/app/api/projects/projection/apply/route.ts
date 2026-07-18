import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { applyProjection } from "@/lib/projection-apply";

// THE GATED APPLY ROUTE (step 254.14) — POST {automation}: the sterile room's diff comes home through
// the gates (whitelist + in-room compile), atomically; refusals teach. See lib/projection-apply.ts.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const result = await applyProjection(String(body?.automation ?? "").trim());
  if (!result.ok) return NextResponse.json(result, { status: 422 });
  return NextResponse.json(result);
}
