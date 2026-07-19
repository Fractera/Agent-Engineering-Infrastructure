import { NextRequest, NextResponse } from "next/server";
import { join } from "node:path";
import { authorize } from "@/lib/nodes";
import { validateProjectDiagram } from "@/lib/diagram/validate";

// Validate a project's diagram invariants (step 223.C.5) — the machine enforcement of "the diagram is
// the only source of truth" + co-location. Returns { ok, violations }. Role-gated via the shared
// authorize() (263.1 round 6): validate is part of the room contract, and the in-room agent reaches it
// with the X-Fractera-Agent-Gate pass — this route's private getSession check was the one door the
// pass could not open.
export const runtime = "nodejs";

const SLUG = /^[a-z][a-z0-9-]*$/;

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const automation = (req.nextUrl.searchParams.get("automation") ?? "").trim();
  const [category, slug] = automation.split("/");
  if (!SLUG.test(category ?? "") || !SLUG.test(slug ?? "")) {
    return NextResponse.json({ error: "invalid automation (expected category/slug)" }, { status: 400 });
  }
  const projectDir = join(process.cwd(), "app", "(projects)", "projects", category, slug);
  const result = await validateProjectDiagram(projectDir);
  return NextResponse.json(result);
}
