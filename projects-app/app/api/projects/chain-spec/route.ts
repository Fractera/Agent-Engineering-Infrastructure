import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { groupMembers, readChainSpec, writeChainSpec } from "@/lib/edges";
import { writeVersionByRef, nextVersionForAutomation } from "@/lib/entity-store";

// THE CHAIN BRIEF (step 236.3) — a "chained" group's own free-text brief (mirrors GET/PATCH
// /api/projects/edges/[cuid], one entity earlier in this same file's shape: read + save the spec text).
// GET also returns the group's CURRENT members (live layout, parentId === this automation) so the panel can
// show them without a second round trip.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const automation = req.nextUrl.searchParams.get("automation") ?? "";
  if (!automation) return NextResponse.json({ error: "automation is required" }, { status: 400 });
  const [spec, members] = await Promise.all([readChainSpec(automation), groupMembers(automation)]);
  return NextResponse.json({ spec, members });
}

export async function PATCH(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { automation?: string; spec?: string };
  const automation = body.automation ?? "";
  if (!automation) return NextResponse.json({ error: "automation is required" }, { status: 400 });
  if (typeof body.spec === "string") {
    // ARCHIVE the OUTGOING brief before overwriting it (step 238 Phase 4) — chain is AUTOMATION-SCOPED
    // (ref='', shared across every automation), so its history uses the automation-scoped helpers, never
    // the CUID ref-based ones (those would collide across different chain groups).
    const prior = await readChainSpec(automation);
    if (prior.trim()) {
      const version = await nextVersionForAutomation(automation, "chain");
      await writeVersionByRef(automation, "chain", "", version, { brief: prior }, null);
    }
    await writeChainSpec(automation, body.spec);
  }
  return NextResponse.json({ ok: true });
}
