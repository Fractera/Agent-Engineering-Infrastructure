import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { automationsWithForks, recomputeSchedule } from "@/lib/schedule";

// The once-a-minute recompute (step 230) — the cron tick (services/cron/server.js posts here every minute)
// recomputes EVERY automation that has forks, so the timeline shifts as runs finish early/late even when no
// one is looking at it. Idempotent: recompute is a pure projection of instances + runs + node estimates, so
// running it repeatedly is safe. Role-gated like the rest (agent/cron identity in IP mode is open).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const automations = await automationsWithForks();
  let recomputed = 0;
  for (const a of automations) {
    try { await recomputeSchedule(a); recomputed++; } catch { /* skip a broken one, keep the tick alive */ }
  }
  return NextResponse.json({ ok: true, automations: automations.length, recomputed });
}
