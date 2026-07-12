import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { pendingSteps } from "@/lib/dev-steps";

// THE WORK QUEUE (step 224 L7 — full-auto). The manual and the automatic flow are the SAME endpoints; the
// only difference is WHO carries the brief. Manual: the owner copies the toast message into a coder chat.
// Full-auto: the coding agent reads THIS queue itself and loops
//
//   1. GET  /api/projects/dev-steps            -> the pending steps (oldest first) with the full brief
//   2. write the node's functions.ts + instruction.ts in _nodes/<slug>/   (the brief says exactly what)
//   3. POST /api/projects/nodes/<cuid>/materialize {"summary":"...","devStepRef":"<number>"}
//        -> the node drops its draft flag, gains version N, and the step file moves to COMPLETED-STEPS/
//   4. repeat while the queue is not empty; the automation leaves "In development" when no draft is left.
//
// So "each node has its own API" = materialize/rollback by its cuid + this queue. No new mechanism: the
// steps are the product's own file queue, read by :3002/service/development-steps.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const steps = await pendingSteps();
  const automation = (req.nextUrl.searchParams.get("automation") ?? "").trim();
  const filtered = automation ? steps.filter((s) => s.automation === automation) : steps;
  return NextResponse.json({ pending: filtered.length, steps: filtered });
}
