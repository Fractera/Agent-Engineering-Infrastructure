import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { canActivate, executeAutomation, type ActivationRefusal } from "@/lib/executor";
import { createScheduledRequest, parseWhen } from "@/lib/scheduled-requests";

// RUN AN AUTOMATION FOR REAL (step 241) — the general executor's HTTP door.
//
//   POST { automation, input?, instanceId? }  → walks the diagram, calls every node's real functions
//   GET  ?automation=<cat/slug>               → the activation check ONLY (can this thing start? why not?)
//
// This replaces nothing and simulates nothing: `test-run` (227.C) stays the honest smoke test of an
// unfinished automation, and lib/schedule.ts's timeline keeps DRAWING the plan. This route is where the
// automation actually WORKS.
//
// THE ACTIVATION GATES (the owner's rule): an automation refuses to start unless its TYPE's preconditions
// hold, and it says exactly which one failed — a silent no-op would be far worse than an error:
//   • any type   — every node must be BUILT (no drafts) and really executable (real function bodies),
//   • instanced  — a FORK must exist AND carry parameters (a run of an instanced automation IS a fork; the
//                  Master is a template. A fork with no parameters would silently run the defaults while
//                  pretending to be a specific run),
//   • chained    — at least one EDGE must exist (a chain that links nothing is not a chain).
export const runtime = "nodejs";

const REFUSAL_STATUS: Record<ActivationRefusal["reason"], number> = {
  "not-found": 404,
  "no-nodes": 409,
  "has-drafts": 409,
  "not-executable": 409,
  "no-fork": 409,
  "fork-without-params": 409,
  "missing-params": 409,
  "no-edges": 409,
};

const REFUSAL_MESSAGE: Record<ActivationRefusal["reason"], string> = {
  "not-found": "automation not found",
  "no-nodes": "this automation has no nodes yet — design them first",
  "has-drafts": "some nodes are still drafts — build them before running (the diagram is the truth)",
  "not-executable": "some nodes have no real function bodies yet — a coding agent must build them",
  "no-fork": "an INSTANCED automation runs as a fork — create a run on the launch panel first",
  "fork-without-params": "this run carries no settings — an instanced run must carry its own (the automation declares which)",
  "missing-params": "this run is missing settings the automation declares as required",
  "no-edges": "a CHAINED automation must be linked to another one — create the link first",
};

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const automation = (req.nextUrl.searchParams.get("automation") ?? "").trim();
  const check = await canActivate(automation);
  if (check.ok) return NextResponse.json({ canActivate: true, type: check.type, instanceId: check.instanceId });
  return NextResponse.json(
    { canActivate: false, ...check.refusal, error: REFUSAL_MESSAGE[check.refusal.reason] },
    { status: REFUSAL_STATUS[check.refusal.reason] },
  );
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; input?: Record<string, unknown>; instanceId?: string }
    | null;
  const automation = String(body?.automation ?? "").trim();

  // SCHEDULED ASK (step 254.8e, owner's law: «напомни через час» fires IN an hour). A declared future
  // "when" stores the request instead of executing; the in-process ticker runs it on time, and the
  // Processes timeline shows it grey until then. Absent/past "when" → execute now, as always.
  const input = body?.input ?? {};
  const dueMs = body?.instanceId ? null : parseWhen(input);
  if (dueMs) {
    const r = await createScheduledRequest(automation, input, dueMs);
    return NextResponse.json({ ok: true, scheduled: true, dueAt: r.due_at, requestId: r.id });
  }

  const result = await executeAutomation(automation, input, { instanceId: body?.instanceId });
  if ("refusal" in result) {
    return NextResponse.json(
      { ok: false, ...result.refusal, error: REFUSAL_MESSAGE[result.refusal.reason] },
      { status: REFUSAL_STATUS[result.refusal.reason] },
    );
  }
  // A node that threw is reported honestly (ok:false + which node + why) — with a 200, because the RUN itself
  // was performed and recorded; the caller reads `ok`.
  return NextResponse.json(result);
}
