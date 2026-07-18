import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { compilePage } from "@/lib/page-compile";

// THE PAGE COMPILE ROUTE (step 254.16) — POST {automation, page}: compiles pages/<page>/page.tsx under
// the dependency contract; the page is LIVE on success (no rebuild). A contract or compiler error comes
// back as the teaching text.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; page?: string } | null;
  const proj = resolveProject(String(body?.automation ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const result = await compilePage(proj.projectDir, String(body?.page ?? "").trim());
  if (!result.ok) return NextResponse.json(result, { status: 422 });
  return NextResponse.json({ ...result, live: true });
}
