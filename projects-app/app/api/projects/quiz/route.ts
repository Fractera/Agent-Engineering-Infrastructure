import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";
import {
  addTurnFor, getPhase, getQuizFor, nextQuestionFor, quizSeed, reopenQuiz, resolveQuizTarget, startQuizFor,
  turnsFor, useCasesGreeting, QUIZ_MAX_NODES,
} from "@/lib/quiz";
import { listCases } from "@/lib/use-cases";

// The Quiz state (step 227; generalized over its SUBJECT in step 225 G4; two PHASES since step 231). GET
// tells the caller whether to open the Quiz (no row yet → first visit) and resumes an interrupted one with
// its turns; POST starts it and returns the FIRST message — in the project's default language.
//
// SUBJECT: ?automation=<category>/<slug> (design a project) OR ?edge=<cuid> (design HOW two automations are
// linked). One set of routes, one brainstorm, two subjects; the row key is "category/slug" or "edge:<cuid>".
//
// PHASE (step 231, projects only): "usecases" → "nodes". A project's Quiz ALWAYS opens on the user cases:
// the owner describes the scenarios first, in free speech, and only when they are detailed enough does the
// Quiz move on to designing nodes. An edge has no such phase (it links automations that already have theirs).
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const t = await resolveQuizTarget({
    automation: req.nextUrl.searchParams.get("automation"),
    edge: req.nextUrl.searchParams.get("edge"),
  });
  if (!t.ok) return NextResponse.json({ error: t.error }, { status: 400 });

  const quiz = await getQuizFor(t.target);
  if (!quiz) {
    return NextResponse.json({
      started: false, subject: t.target.kind, phase: t.target.kind === "project" ? "usecases" : "nodes",
      maxNodes: QUIZ_MAX_NODES,
    });
  }
  const phase = await getPhase(quiz, t.target);
  return NextResponse.json({
    started: true,
    subject: t.target.kind,
    phase,
    caseCount: t.target.kind === "project" ? (await listCases(t.target.automation)).length : 0,
    status: quiz.status,
    language: quiz.language,
    nodeCount: quiz.node_count,
    maxNodes: QUIZ_MAX_NODES,
    turns: await turnsFor(quiz, t.target),
  });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; edge?: string; reopen?: boolean } | null;
  const t = await resolveQuizTarget({ automation: body?.automation, edge: body?.edge });
  if (!t.ok) return NextResponse.json({ error: t.error }, { status: 400 });

  const quiz = await startQuizFor(t.target);

  // Re-opened from the global canvas after the owner had ended the session (step 225 G4). The 10-node cap
  // still holds — it is the context-overflow guard, not a UI limit.
  if (quiz.status === "done" && body?.reopen) {
    const { reopened, capped } = await reopenQuiz(quiz);
    if (!reopened) {
      return NextResponse.json({
        ok: true, subject: t.target.kind, capped, question: null, nodeCount: quiz.node_count,
        error: capped ? `This design session already produced its ${QUIZ_MAX_NODES} nodes — build them first, then start a new one.` : undefined,
      });
    }
  }

  const phase = await getPhase(quiz, t.target);
  const turns = await turnsFor(quiz, t.target);
  if (turns.length) {
    return NextResponse.json({
      ok: true, subject: t.target.kind, phase, question: turns[turns.length - 1].content, turns,
      nodeCount: quiz.node_count,
    });
  }

  // PHASE 1 (step 231): the first thing the owner reads is the use-case briefing — a deterministic text, not
  // a model call, so it can never fail, drift, or depend on the API key being set yet.
  if (phase === "usecases") {
    const greeting = await useCasesGreeting(quiz.language);
    await addTurnFor(quiz, t.target, "assistant", greeting);
    return NextResponse.json({
      ok: true, subject: t.target.kind, phase, question: greeting, nodeCount: 0, language: quiz.language,
    });
  }

  try {
    const seed = await quizSeed(t.target);
    const question = await nextQuestionFor(quiz, t.target, seed, []);
    await addTurnFor(quiz, t.target, "assistant", question);
    return NextResponse.json({
      ok: true, subject: t.target.kind, phase, question, nodeCount: quiz.node_count, language: quiz.language,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
