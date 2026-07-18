import { NextRequest, NextResponse } from "next/server";
import { getLifecycleState } from "@/lib/entity-store";
import { authorize, resolveProject } from "@/lib/nodes";

// THE LIFECYCLE READ (step 255.B5) — GET ?automation= → { state: "frozen-demo" | "real-automation" }.
// The frozen-template notices read it: they vanish the moment real work lands (materialize /
// entity-summary flip the flag, step 249) — the owner's "the starter badges disappear when development
// completes".
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  return NextResponse.json({ state: await getLifecycleState(proj.automation) });
}
