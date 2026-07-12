import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject, syncIndexFromFiles, listNodes } from "@/lib/nodes";

// The live canvas index (step 224 L3) — GET ?automation=<category>/<slug> returns the lightweight node
// list the Builder canvas renders (cuid, name, draft, position, versions). It seeds the index from the
// files first (so pre-existing folder nodes appear) and never loads the heavy version snapshots. The
// canvas unions this with the build-time DIAGRAM_NODES prop by cuid, so a just-created draft shows without
// a rebuild while materialized nodes come from the built file.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const automation = (req.nextUrl.searchParams.get("automation") ?? "").trim();
  const proj = resolveProject(automation);
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  await syncIndexFromFiles(proj.automation, proj.projectDir);
  return NextResponse.json({ nodes: await listNodes(proj.automation) });
}
