import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import {
  addTurn, getQuizFor, nextQuestionFor, quizSeed, resolveQuizTarget, startQuizFor, turnsOf, QUIZ_MAX_NODES,
} from "@/lib/quiz";

// The Quiz state (step 227; generalized over its SUBJECT in step 225 G4). GET tells the caller whether to
// open the Quiz (no row yet → first visit) and resumes an interrupted one with its turns; POST starts it
// and returns the FIRST question — in the project's default language.
//
// SUBJECT: ?automation=<category>/<slug> (design the NODES of a project) OR ?edge=<cuid> (design HOW two
// automations are linked — brainstormed from the global canvas). One set of routes, one brainstorm, two
// subjects; the row key is "category/slug" or "edge:<cuid>".
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const t = await resolveQuizTarget({
    automation: req.nextUrl.searchParams.get("automation"),
    edge: req.nextUrl.searchParams.get("edge"),
  });
  if (!t.ok) return NextResponse.json({ error: t.error }, { status: 400 });

  const quiz = await getQuizFor(t.target);
  if (!quiz) return NextResponse.json({ started: false, subject: t.target.kind, maxNodes: QUIZ_MAX_NODES });
  return NextResponse.json({
    started: true,
    subject: t.target.kind,
    status: quiz.status,
    language: quiz.language,
    nodeCount: quiz.node_count,
    maxNodes: QUIZ_MAX_NODES,
    turns: await turnsOf(quiz),
  });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; edge?: string } | null;
  const t = await resolveQuizTarget({ automation: body?.automation, edge: body?.edge });
  if (!t.ok) return NextResponse.json({ error: t.error }, { status: 400 });

  const quiz = await startQuizFor(t.target);
  const turns = await turnsOf(quiz);
  if (turns.length) {
    return NextResponse.json({
      ok: true, subject: t.target.kind, question: turns[turns.length - 1].content, turns, nodeCount: quiz.node_count,
    });
  }

  try {
    const seed = await quizSeed(t.target);
    const question = await nextQuestionFor(quiz, t.target, seed, []);
    await addTurn(quiz, "assistant", question);
    return NextResponse.json({
      ok: true, subject: t.target.kind, question, nodeCount: quiz.node_count, language: quiz.language,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
