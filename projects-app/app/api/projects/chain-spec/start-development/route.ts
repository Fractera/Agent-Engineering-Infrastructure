import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { groupMembers, readChainSpec } from "@/lib/edges";
import { materializeChainStep, nextStepNumber } from "@/lib/dev-steps";

// "Start development" for a CHAIN group (step 236.3) — mirrors /api/projects/edges/[cuid]/start-development
// exactly (same queue, same brief-to-step shape), scoped to the group's CURRENT membership instead of one
// edge's two endpoints. No materialize/version call afterwards (unlike an edge) — a chain group has no code
// of its own; the coder wires the member automations' own emit/subscribe per the brief and closes the step
// like any other.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { automation?: string };
  const automation = body.automation ?? "";
  const proj = resolveProject(automation);
  if (!proj.ok) return NextResponse.json({ error: "automation not found" }, { status: 404 });

  const [spec, members] = await Promise.all([readChainSpec(automation), groupMembers(automation)]);
  const number = await nextStepNumber();
  const { file, message } = await materializeChainStep({
    number,
    groupAutomation: automation,
    groupName: proj.slug,
    members,
    spec,
  });

  return NextResponse.json({ ok: true, number, file, message });
}
