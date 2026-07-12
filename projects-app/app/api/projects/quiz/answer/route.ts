import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import { addTurn, getQuizFor, nextQuestionFor, quizSeed, resolveQuizTarget, turnsOf } from "@/lib/quiz";

// One brainstorm turn (step 227; both subjects since 225 G4): the owner answers, the model asks its next
// question — or replies READY when it understands this node / this link. The owner can ignore READY and keep
// talking, or close the subject at any moment (/next-node for a node, /edge-apply for a link).
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

  await addTurn(quiz, "user", answer);
  try {
    const seed = await quizSeed(t.target);
    const question = await nextQuestionFor(quiz, t.target, seed, await turnsOf(quiz));
    const ready = /^READY\b/i.test(question.trim());
    await addTurn(quiz, "assistant", question);
    return NextResponse.json({ ok: true, question, ready });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
