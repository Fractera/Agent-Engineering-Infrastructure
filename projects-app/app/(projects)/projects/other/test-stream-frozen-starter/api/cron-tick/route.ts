import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";

// THE CRON TICK ROUTE for this automation (Cron entity). Called by fractera-cron per the schedule
// declared in this automation's own cron.json — the runner sends an agent identity header the shared
// authorize() gate already recognizes (same as every other cron-triggered project route).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true, note: "no actuation wired yet — pending a later integration step" });
}
