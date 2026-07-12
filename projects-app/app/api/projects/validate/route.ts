import { NextRequest, NextResponse } from "next/server";
import { join } from "node:path";
import { getSession } from "@/lib/auth/get-session";
import { validateProjectDiagram } from "@/lib/diagram/validate";

// Validate a project's diagram invariants (step 223.C.5) — the machine enforcement of "the diagram is
// the only source of truth" + co-location. Returns { ok, violations }. Role-gated.
export const runtime = "nodejs";

const ROLES = ["architect", "manager", "agent"];
const SLUG = /^[a-z][a-z0-9-]*$/;

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session?.roles?.some((r) => ROLES.includes(r))) {
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
