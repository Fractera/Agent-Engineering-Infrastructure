import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import {
  deleteQuiz, getQuizFor, quizSeed, resolveQuizTarget, synthesizeCaseEdit, turnsFor,
} from "@/lib/quiz";
import { addCase, caseByCuid, listCases, regenerateUseCasesFile, updateCase } from "@/lib/use-cases";

// EDITING the user cases of a live automation (step 231) — the closing move of the pencil sessions:
//   • the pencil on the panel's header  → {automation, cases:true} — the owner walked the WHOLE set,
//   • the pencil on one case            → {useCase:<cuid>}        — he revisited that one.
//
// The brainstorm becomes the cases' NEW text, and every case that changed (or was added) becomes ONE
// development step in the existing file queue — the same pipeline a node uses, never a second mechanism.
// The session is then dropped: the next pencil click is a fresh conversation about the scenarios as they
// stand THEN.
//
// Editing a case also STALES the owner's review (the case-set hash changed), so the next development step
// asks him to read the cases back and confirm again — that is the point of the gate.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; useCase?: string; cases?: boolean }
    | null;
  const t = await resolveQuizTarget({ automation: body?.automation, useCase: body?.useCase, cases: body?.cases });
  if (!t.ok) return NextResponse.json({ error: t.error }, { status: 400 });
  const target = t.target;
  if (target.kind !== "usecase" && target.kind !== "usecases") {
    return NextResponse.json({ error: "not a user-case session" }, { status: 400 });
  }

  const quiz = await getQuizFor(target);
  if (!quiz) return NextResponse.json({ error: "quiz not started" }, { status: 400 });

  const seed = await quizSeed(target);
  const turns = await turnsFor(quiz, target);

  let edits: { cuid?: string; title: string; summary: string }[];
  try {
    edits = await synthesizeCaseEdit(quiz, seed, turns, target.kind === "usecase" ? target.cuid : undefined);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  // STEP 240 — a changed case no longer dispatches a development step of its own. It is STAGED: its status
  // stays "new", which is exactly what makes it `pending` in the architecture bundle, so the page's wave
  // banner picks it up together with everything else the owner changed in this round. (Jumping it straight to
  // "in-development", as this route used to, would have HIDDEN it from the wave — a case is only pending
  // while new/in-approval.) The old per-case steps also raced the review gate: the owner must re-confirm the
  // case set anyway, since editing a case resets the confirmation (step 231).
  let changed = 0;

  for (const e of edits) {
    const existing = e.cuid ? await caseByCuid(e.cuid) : undefined;
    // A case the model claims to edit must belong to THIS automation — never let a stray cuid cross projects.
    if (existing && existing.automation !== target.automation) continue;

    if (existing) {
      if (existing.title === e.title && existing.summary === e.summary) continue; // nothing actually changed
      await updateCase(existing.cuid, { title: e.title, summary: e.summary, status: "new" });
    } else {
      await addCase(target.automation, { title: e.title, summary: e.summary, status: "new" });
    }
    changed++;
  }

  if (changed) await regenerateUseCasesFile(target.projectDir, target.automation);
  await deleteQuiz(quiz);

  return NextResponse.json({
    ok: true,
    changed,
    steps: [],   // kept for the client's shape; the wave is what dispatches now
    cases: await listCases(target.automation),
    report: changed
      ? `${changed} case${changed === 1 ? "" : "s"} changed — staged for the next development wave. Confirm the cases, then press "Launch development" on the page.`
      : "Nothing changed — the cases stay as they were.",
  });
}
