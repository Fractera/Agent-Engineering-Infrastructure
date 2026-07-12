import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import {
  addCase, deleteCase, listCases, regenerateUseCasesFile, reviewState, seedStoreFromFile, updateCase,
} from "@/lib/use-cases";

// USER CASES API (step 231) — the live store behind the Use cases panel. The DB is the source; every write
// regenerates the project's _data/use-cases.ts (the artefact the coding agent and the build read).
//
// GET    ?automation=cat/slug   → the cases + the review state (has the owner confirmed THIS set?)
// POST   {automation, title, summary?, status?}            → add a case
// POST   {automation, cuid, title?, summary?, status?}     → edit a case
// DELETE ?automation=cat/slug&cuid=…                       → delete a case (the UI confirms first)
//
// Any add / edit / delete changes the case-set hash, which STALES the owner's review — the next development
// step will ask him to read and confirm again (the "AI and human agree" checkpoint).
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject(req.nextUrl.searchParams.get("automation") ?? "");
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  // A project born before this step keeps its cases in the file — lift them into the store once.
  await seedStoreFromFile(proj.automation, proj.projectDir);
  return NextResponse.json({
    cases: await listCases(proj.automation),
    review: await reviewState(proj.automation),
  });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; cuid?: string; title?: string; summary?: string; status?: string }
    | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  if (body?.cuid) {
    await updateCase(body.cuid, { title: body.title, summary: body.summary, status: body.status });
  } else {
    const title = (body?.title ?? "").trim();
    if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
    await addCase(proj.automation, { title, summary: body?.summary, status: body?.status });
  }
  await regenerateUseCasesFile(proj.projectDir, proj.automation);
  return NextResponse.json({ ok: true, cases: await listCases(proj.automation), review: await reviewState(proj.automation) });
}

export async function DELETE(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject(req.nextUrl.searchParams.get("automation") ?? "");
  const cuid = req.nextUrl.searchParams.get("cuid") ?? "";
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  if (!cuid) return NextResponse.json({ error: "cuid is required" }, { status: 400 });

  await deleteCase(cuid);
  await regenerateUseCasesFile(proj.projectDir, proj.automation);
  return NextResponse.json({ ok: true, cases: await listCases(proj.automation), review: await reviewState(proj.automation) });
}
