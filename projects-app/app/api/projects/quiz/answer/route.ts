import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { addTurn, automationInstruction, getQuiz, nextQuestion, turnsOf } from "@/lib/quiz";

// One brainstorm turn (step 227): the owner answers, the model asks its next question — or replies READY
// when it understands this node. The owner can ignore READY and keep talking, or press "Next node" at any
// moment (that is the /next-node route, which turns the brainstorm into a real node).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; answer?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const answer = String(body?.answer ?? "").trim();
  if (!answer) return NextResponse.json({ error: "answer is required" }, { status: 400 });

  const quiz = await getQuiz(proj.automation);
  if (!quiz) return NextResponse.json({ error: "quiz not started" }, { status: 400 });

  await addTurn(quiz, "user", answer);
  const instruction = await automationInstruction(proj.projectDir);
  try {
    const question = await nextQuestion(quiz, instruction, await turnsOf(quiz));
    const ready = /^READY\b/i.test(question.trim());
    await addTurn(quiz, "assistant", question);
    return NextResponse.json({ ok: true, question, ready });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
