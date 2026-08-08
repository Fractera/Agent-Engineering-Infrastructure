import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { readState, writeState, type AutoDeployMode } from "@/lib/auto-deploy";

const MODES: AutoDeployMode[] = ["off", "pull", "pull+deploy"];

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await readState());
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mode } = (await req.json().catch(() => ({}))) as { mode?: AutoDeployMode };
  if (!mode || !MODES.includes(mode)) {
    return NextResponse.json({ error: `mode must be one of ${MODES.join(", ")}` }, { status: 400 });
  }

  try {
    const current = await readState();
    // Switching the mode clears the previous verdict: a reason that belonged to the old mode would
    // read as the new mode's first answer, which it is not.
    await writeState({ ...current, mode, lastResult: null, lastReason: null });
    return NextResponse.json({ ok: true, mode });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
