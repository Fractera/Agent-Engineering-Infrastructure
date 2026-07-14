import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { readHowItWorks } from "@/lib/how-it-works";

// GET ?automation=<cat/slug> -> { result: HowItWorks | null } — the modal's initial read (step 237).
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const result = await readHowItWorks(proj.projectDir);
  return NextResponse.json({ result });
}
