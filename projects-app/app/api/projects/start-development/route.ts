import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { materializeWaveStep, nextStepNumber } from "@/lib/dev-steps";
import { assertUseCasesReviewed } from "@/lib/use-cases";
import { pendingWaveStep, stagedItems, stubItems, waveName } from "@/lib/wave";

// "LAUNCH DEVELOPMENT" — the automation page's ONE and ONLY hand-off (step 240, replacing step 233's
// draft-nodes-only bundle and, with it, every per-entity "Start development" button).
//
// The owner's reasoning: handing each edit over on its own is slow and expensive. He wants to change several
// things — a dashboard requirement, then analytics, a use case, a couple of nodes — and hand the WHOLE batch
// to a coding agent at once, as one wave. So this route bundles EVERY staged change (every entity instance
// flagged pending:true — step 238's own flag, across all ten entity types) into ONE Development Step, whose
// sub-steps are those changes. The owner sees only the number: "run step #NN".
//
// After it, the page is LOCKED (a bundled wave step is pending) until the coding agent calls
// development-wave/complete on a successful deploy. That is what stops the sent brief from silently going
// stale while someone keeps editing.
//
// THE GATE stays (step 231): nothing is handed over until the owner has read the use cases back and confirmed
// the AI understood him.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const gate = await assertUseCasesReviewed(proj.automation);
  if (!gate.ok) return NextResponse.json({ reason: gate.reason }, { status: 409 });

  // IDEMPOTENT + THE LOCK: a wave already in flight is never duplicated — the owner just gets its number back
  // (this is the same check the page's lock reads, so the two can never disagree).
  const existing = await pendingWaveStep(proj.automation);
  if (existing) {
    return NextResponse.json({ ok: true, number: existing.number, name: existing.name, reused: true, locked: true });
  }

  const items = await stagedItems(proj.automation);
  if (!items.length) return NextResponse.json({ reason: "nothing-staged" }, { status: 409 });

  // STEP 247 (П5) — STUB NODES NEVER REACH A CODING AGENT. A node whose spec is still the system stub has no
  // requirement to build from; handing it over just makes the agent burn its escalation channel on "this
  // node has no description" (the first live warning of step 246 was exactly that). The owner describes the
  // node or deletes it — then launches.
  const stubs = stubItems(items);
  if (stubs.length) {
    return NextResponse.json({ reason: "stub-nodes", nodes: stubs.map((s) => s.label) }, { status: 409 });
  }

  const number = await nextStepNumber();
  const name = waveName(proj.automation, items);
  const { message } = await materializeWaveStep({ number, automation: proj.automation, name, items });

  return NextResponse.json({
    ok: true, number, name, message, locked: true,
    items: items.map((i) => ({ entityType: i.entityType, ref: i.ref, label: i.label })),
  });
}
