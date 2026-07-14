import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { buildArchitecture } from "@/lib/entity-architecture";

// JSON2 (step 238) — the CURRENT-only snapshot: every entity's current state, no version history arrays.
// Use for the "How it works" modal, use-case debugging, and as the 2nd+ context object within an ongoing
// development session, when deep debugging isn't the task.
//   GET ?automation=<cat/slug> -> ArchitectureBundle (format: "current-snapshot")
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const bundle = await buildArchitecture(proj.automation, false);
  return NextResponse.json(bundle);
}
