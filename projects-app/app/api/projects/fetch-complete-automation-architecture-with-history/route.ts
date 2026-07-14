import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { buildArchitecture } from "@/lib/entity-architecture";

// JSON1 (step 238) — the FULL architecture: every entity's current state AND its full version history.
// Use at the start of a coding-agent context window, or for deep debugging of the automation. This is an
// ADDITIVE tool — the existing node/edge "start development" handoff stays address-based (step 233),
// unaffected by this route.
//   GET ?automation=<cat/slug> -> ArchitectureBundle (format: "full-with-history")
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const bundle = await buildArchitecture(proj.automation, true);
  return NextResponse.json(bundle);
}
