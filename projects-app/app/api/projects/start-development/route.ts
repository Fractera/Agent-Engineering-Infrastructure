import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { authorize, listNodes, resolveProject } from "@/lib/nodes";
import { materializeAutomationStep, nextStepNumber, pendingSteps } from "@/lib/dev-steps";
import { assertUseCasesReviewed, listCases } from "@/lib/use-cases";

// "Start development" (step 233) — the owner's single top-level handoff on the automation page. It turns the
// whole design so far into ONE Development Step: the sub-steps (tasks[]) are the draft nodes going into work,
// and the brief carries the ordered mandatory read (AUTOMATION-PROJECTS.md → the Quiz result → the nodes).
// The owner is handed only the NUMBER — "run step #NN" — never the raw brief.
//
// THE GATE stays (step 231): no step is created until the owner has read the use cases and confirmed the AI
// understood him. The refusal carries a reason so the modal can show the cases inline.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const gate = await assertUseCasesReviewed(proj.automation);
  if (!gate.ok) return NextResponse.json({ reason: gate.reason }, { status: 409 });

  // IDEMPOTENT: if a bundled "Develop <automation>" step is already waiting, return its number — one click,
  // one step; a second click never queues a duplicate.
  const existing = (await pendingSteps()).find(
    (s) => s.automation === proj.automation && /^Develop /.test(s.name),
  );
  if (existing) {
    return NextResponse.json({ ok: true, number: existing.number, name: existing.name, reused: true });
  }

  // The nodes going into work = the DRAFT (unbuilt) nodes. Their specs are the Quiz result per node.
  const nodes = await listNodes(proj.automation);
  const drafts = nodes.filter((n) => n.draft === 1);
  if (!drafts.length) {
    return NextResponse.json({ reason: "no-nodes" }, { status: 409 });
  }

  const instruction = (await readFile(join(proj.projectDir, "_data", "instruction.md"), "utf8").catch(() => "")).trim();
  const cases = await listCases(proj.automation);
  const nodeInputs = await Promise.all(
    drafts.map(async (n) => ({
      cuid: n.cuid,
      slug: n.slug,
      name: n.name,
      spec: await readFile(join(proj.projectDir, "_nodes", n.slug, "spec.md"), "utf8").catch(() => ""),
    })),
  );

  const number = await nextStepNumber();
  const { name } = await materializeAutomationStep({
    number,
    automation: proj.automation,
    instruction,
    useCases: cases.map((c) => ({ title: c.title, summary: c.summary, status: c.status })),
    nodes: nodeInputs,
  });

  return NextResponse.json({ ok: true, number, name });
}
