import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "node:fs";
import { authorize, resolveProject } from "@/lib/nodes";

// EXISTENCE PROBE (step 301, the pending-card fix). An automation's page is a COMPILED static route, so a
// freshly created automation returns 404 for the ~1-2 min its rebuild runs — the SAME 404 a DELETED
// automation returns. The optimistic pending card cannot tell "still building" from "gone" by HTTP status
// alone, and used to drop the spinner on the building 404 (the card vanished after a few seconds, then a
// reload showed a clickable card whose route still 404'd). This endpoint is the source of truth the client
// lacks: does the automation's FOLDER exist on disk RIGHT NOW? The folder is written the instant the
// automation is created and is unaffected by the compiled-route rebuild, so folder-present = "building" and
// folder-absent = "gone". The client keeps its spinner while the folder exists and drops the card only when
// it is truly gone. This route lives under /api, so it is always compiled and never 404s itself.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  // A malformed address is treated as "still there" (exists: true) on purpose: only a DEFINITE "the folder
  // is gone" should ever remove a card, never a transient/parse hiccup (the client's never-drop-on-a-guess
  // rule). resolveProject only fails on a bad param, which a real pending entry never has.
  if (!proj.ok) return NextResponse.json({ exists: true });
  return NextResponse.json({ exists: existsSync(proj.projectDir) });
}
