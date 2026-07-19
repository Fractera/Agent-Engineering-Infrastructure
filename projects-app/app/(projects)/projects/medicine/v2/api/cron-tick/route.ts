import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";

// THE SCHEDULED TICK DOOR — for cron.json jobs of this automation (scheduled OUTPUT work: reports,
// digests, external DATA-API pulls). It is NOT an input path: incoming Telegram messages are PUSHED
// into api/run by the platform listener (register-bot; WIRING-RULES law 5g) — a getUpdates poll here
// fought that listener for the same token and was removed (263.1, owner's ruling).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ ok: true, note: "scheduled tick — no scheduled work declared yet" });
}
