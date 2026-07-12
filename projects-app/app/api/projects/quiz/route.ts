import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { addTurn, automationInstruction, getQuiz, nextQuestion, startQuiz, turnsOf, QUIZ_MAX_NODES } from "@/lib/quiz";

// The Quiz state (step 227). GET tells the page whether to open the Quiz (first visit → no quiz row yet),
// and resumes an interrupted one with its turns. POST starts it and returns the FIRST question — asked in
// the project's default language, seeded with the owner's instruction from phase 1.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const quiz = await getQuiz(proj.automation);
  if (!quiz) return NextResponse.json({ started: false, maxNodes: QUIZ_MAX_NODES });
  return NextResponse.json({
    started: true,
    status: quiz.status,
    language: quiz.language,
    nodeCount: quiz.node_count,
    maxNodes: QUIZ_MAX_NODES,
    turns: await turnsOf(quiz),
  });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const quiz = await startQuiz(proj.automation);
  const turns = await turnsOf(quiz);
  if (turns.length) return NextResponse.json({ ok: true, question: turns[turns.length - 1].content, turns, nodeCount: quiz.node_count });

  const instruction = await automationInstruction(proj.projectDir);
  try {
    const question = await nextQuestion(quiz, instruction, []);
    await addTurn(quiz, "assistant", question);
    return NextResponse.json({ ok: true, question, nodeCount: quiz.node_count, language: quiz.language });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
