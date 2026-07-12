import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { recomputeSchedule } from "@/lib/schedule";

// THE PROCESSES / Gantt timeline (step 230) — GET ?automation=<cat/slug> recomputes and returns the fork
// schedule: one row per fork (nearest first), its planned window, its actual window (from automation_runs),
// and its nodes laid out inside the bar. `now` is the server clock the client draws the "now" line against.
// The timeline is only meaningful for automations that HAVE forks; an automation with none returns [].
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const rows = await recomputeSchedule(proj.automation);
  return NextResponse.json({ rows, now: Date.now() });
}
