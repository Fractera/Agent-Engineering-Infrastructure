import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { listAutomationPages } from "@/lib/app-pages/scan";

// THIS AUTOMATION'S APPLICATION PAGES (step 242.4) — GET ?automation=<cat/slug> -> { pages: PageBrief[] }.
// Replaces the slot-app TREE (removed, owner's simplification): the accordion lists only the pages THIS
// automation declared, each opening straight into its planning (to-dos + Quiz). Read-only fs, no rebuild.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  return NextResponse.json({ pages: await listAutomationPages(proj.automation) });
}
