import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { resetAutomation, runAutomation } from "@/lib/schedule";

// The Processes timeline controls (step 230) — the owner decides WHEN the forks run.
//   POST { automation, action: "run" }   → clear prior runs and start the first fork; the queue chains on.
//   POST { automation, action: "reset" } → drop all runs; the timeline returns to the plan (nothing runs).
// Without this the runner would cold-start on any page poll; with it the timeline waits for "Run".
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; action?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  if (body?.action === "run") {
    await runAutomation(proj.automation);
    return NextResponse.json({ ok: true, action: "run" });
  }
  if (body?.action === "reset") {
    await resetAutomation(proj.automation);
    return NextResponse.json({ ok: true, action: "reset" });
  }
  return NextResponse.json({ error: "action must be run | reset" }, { status: 400 });
}
