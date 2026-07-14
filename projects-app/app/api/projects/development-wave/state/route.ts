import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { waveOf } from "@/lib/wave";

// THE WAVE'S STATE (step 240) — GET ?automation=<cat/slug> -> { state, items[], step? }.
//   idle    — nothing staged: the page behaves as before.
//   staging — at least one change is staged: the banner appears ("finish your changes, then launch").
//   locked  — a wave was handed to a coding agent and its step is still open: every tool on the page
//             refuses to act and shows the lock modal instead.
// Derived, never stored (see lib/wave.ts): staged = every entity instance with pending:true (step 238's own
// flag), locked = the bundled step still sitting in DEVELOPMENT-STEPS/NEW-STEPS/. No new table, nothing to
// reset, nothing that can drift out of sync with reality.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  return NextResponse.json(await waveOf(proj.automation));
}
