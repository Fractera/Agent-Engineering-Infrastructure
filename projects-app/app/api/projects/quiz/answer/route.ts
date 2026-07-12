import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { addTurnFor, getPhase, getQuizFor, nextQuestionFor, quizSeed, resolveQuizTarget, turnsFor } from "@/lib/quiz";

// One brainstorm turn (step 227; both subjects since 225 G4; both phases since 231): the owner answers, the
// model asks its next question — or replies READY when it understands this node / this link, or (in the
// use-case phase) when the scenarios are described in enough detail. The owner can ignore READY and keep
// talking, or close the subject at any moment (/usecases-apply for the scenarios, /next-node for a node,
// /edge-apply for a link).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; edge?: string; answer?: string } | null;
  const t = await resolveQuizTarget({ automation: body?.automation, edge: body?.edge });
  if (!t.ok) return NextResponse.json({ error: t.error }, { status: 400 });
  const answer = String(body?.answer ?? "").trim();
  if (!answer) return NextResponse.json({ error: "answer is required" }, { status: 400 });

  const quiz = await getQuizFor(t.target);
  if (!quiz) return NextResponse.json({ error: "quiz not started" }, { status: 400 });

  await addTurnFor(quiz, t.target, "user", answer);
  try {
    const seed = await quizSeed(t.target);
    const question = await nextQuestionFor(quiz, t.target, seed, await turnsFor(quiz, t.target));
    const ready = /^READY\b/i.test(question.trim());
    await addTurnFor(quiz, t.target, "assistant", question);
    return NextResponse.json({ ok: true, phase: await getPhase(quiz, t.target), question, ready });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
