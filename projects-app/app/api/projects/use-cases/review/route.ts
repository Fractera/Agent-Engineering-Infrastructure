import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { confirmReview, listCases, regenerateUseCasesFile, reviewState } from "@/lib/use-cases";

// THE REVIEW GATE (step 231) — the checkpoint of the Development Steps pipeline where the owner and the AI
// agree that the automation was understood. The owner reads the cases back and presses "I read them"; we
// store a hash of exactly what he confirmed, and move every case that was still `new` to `approved`.
//
// It is deliberately NOT a silent flag: no development step is materialized (Quiz "next node", Builder
// "Start development") until this confirmation exists and matches the CURRENT case set — editing, adding or
// deleting a case invalidates it, and the owner is asked again.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject(req.nextUrl.searchParams.get("automation") ?? "");
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  return NextResponse.json(await reviewState(proj.automation));
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const st = await confirmReview(proj.automation);
  if (!st.hasCases) {
    return NextResponse.json(
      { error: "There is nothing to confirm — this automation has no user cases yet." },
      { status: 409 },
    );
  }
  await regenerateUseCasesFile(proj.projectDir, proj.automation);
  return NextResponse.json({ ok: true, review: st, cases: await listCases(proj.automation) });
}
