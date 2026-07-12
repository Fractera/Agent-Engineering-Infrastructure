import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { authorize, listNodes, resolveProject } from "@/lib/nodes";
import { materializeNodeStep, nextStepNumber, pendingSteps } from "@/lib/dev-steps";
import { assertUseCasesReviewed } from "@/lib/use-cases";

// "Start development" (step 231/232) — the owner's single entry point from the automation page: turn the
// current DRAFT nodes into development steps he can hand to a coding agent. It is the top-level companion to
// the per-node Builder rocket: one click materializes a step for every draft node that does not have one yet
// (idempotent — a node already queued is not queued twice), and returns the copy-paste brief + number of
// EVERY step waiting for this automation, so the modal can show them.
//
// THE GATE stays (step 231): no step is created until the owner has read the use cases and confirmed the AI
// understood him. The refusal carries a reason so the UI can open the Use cases panel.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const gate = await assertUseCasesReviewed(proj.automation);
  if (!gate.ok) return NextResponse.json({ reason: gate.reason }, { status: 409 });

  const nodes = await listNodes(proj.automation);
  const drafts = nodes.filter((n) => n.draft === 1);

  // Which draft nodes already have a step waiting — never queue a node twice.
  const queuedCuids = new Set((await pendingSteps()).filter((s) => s.automation === proj.automation).map((s) => s.nodeCuid));

  for (const n of drafts) {
    if (queuedCuids.has(n.cuid)) continue;
    const spec = await readFile(join(proj.projectDir, "_nodes", n.slug, "spec.md"), "utf8").catch(() => "");
    const number = await nextStepNumber();
    await materializeNodeStep({
      number,
      automation: proj.automation,
      nodeCuid: n.cuid,
      nodeSlug: n.slug,
      nodeName: n.name,
      spec,
      optimization: false,
      targetVersion: n.latest_version + 1,
    });
  }

  // Return every pending step for this automation (the just-created + any already waiting), newest numbering.
  const steps = (await pendingSteps())
    .filter((s) => s.automation === proj.automation)
    .map((s) => ({ number: s.number, name: s.name, nodeSlug: s.nodeSlug, message: s.message }))
    .sort((a, b) => a.number - b.number);

  return NextResponse.json({ ok: true, steps, draftCount: drafts.length });
}
