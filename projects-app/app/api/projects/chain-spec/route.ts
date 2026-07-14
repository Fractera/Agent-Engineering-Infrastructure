import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { groupMembers, readChainSpec, writeChainSpec } from "@/lib/edges";

// THE CHAIN BRIEF (step 236.3) — a "chained" group's own free-text brief (mirrors GET/PATCH
// /api/projects/edges/[cuid], one entity earlier in this same file's shape: read + save the spec text).
// GET also returns the group's CURRENT members (live layout, parentId === this automation) so the panel can
// show them without a second round trip.
//
// PATCH is a plain DRAFT overwrite — nothing is archived here (step 238 Phase 2 correction). Archiving the
// outgoing brief belongs at the point it is actually HANDED to a coding agent
// (POST .../chain-spec/start-development), never at a draft-save: archiving on every PATCH would create a
// phantom history entry for every edit the owner makes while still drafting, even if "Start development" is
// never clicked — the opposite of what the owner asked for ("обнуляется СРАЗУ ПОСЛЕ того как мы будем
// вскармливать его ИИ для разработки", not "on every keystroke").
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
  if (typeof body.spec === "string") await writeChainSpec(automation, body.spec);
  return NextResponse.json({ ok: true });
}
