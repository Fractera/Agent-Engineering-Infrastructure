import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { executeAutomation } from "@/lib/executor";
import { createScheduledRequest, parseWhen } from "@/lib/scheduled-requests";

// THE RUN DOOR of this automation (step 254.11) — the single runtime entrance both the cockpit and the
// public surface call: /projects/other/test-stream-frozen-starter/api/run. Fixed to THIS automation by birth.
export const runtime = "nodejs";

const AUTOMATION = "other/test-stream-frozen-starter";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { input?: Record<string, unknown>; instanceId?: string }
    | null;
  const input = body?.input ?? {};
  const dueMs = body?.instanceId ? null : parseWhen(input);
  if (dueMs) {
    const r = await createScheduledRequest(AUTOMATION, input, dueMs);
    return NextResponse.json({ ok: true, scheduled: true, dueAt: r.due_at, requestId: r.id });
  }
  const result = await executeAutomation(AUTOMATION, input, { instanceId: body?.instanceId });
  if ("refusal" in result) return NextResponse.json({ ok: false, ...result.refusal }, { status: 409 });
  return NextResponse.json(result);
}
