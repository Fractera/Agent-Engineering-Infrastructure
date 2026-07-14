import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { finishQuiz, getQuizByKey, pageContext, pageQuizKey, synthesizePage, turnsOf } from "@/lib/quiz";
import { addTask } from "@/lib/app-pages/readme";

// "Add with AI" closing move for a PUBLIC PAGE (step 242) — the page equivalent of quiz/entity-apply. It does
// NOT dispatch a development step and does NOT touch a version: the brainstorm becomes a TO-DO LIST written
// into the page's README (the same file the accordion's manual to-do list writes to, and the record a coding
// agent reads). So this route: (1) synthesizes the to-dos from the transcript, (2) appends each to the page
// README, (3) ends the session (a page is one subject, no "next"). The panel re-reads the list on close.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; page?: string } | null;
  const rel = String(body?.page ?? "").trim();
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  if (!rel) return NextResponse.json({ error: "page is required" }, { status: 400 });

  const quiz = await getQuizByKey(pageQuizKey(proj.automation, rel));
  if (!quiz) return NextResponse.json({ error: "quiz not started" }, { status: 400 });

  const seed = await pageContext(proj.automation, proj.projectDir, rel);
  const turns = await turnsOf(quiz);

  let result: { todos: string[] };
  try {
    result = await synthesizePage(quiz, seed, turns);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  // Append each synthesized item as a to-do in the page's README — the same write path as the manual list.
  for (const line of result.todos) await addTask(rel, line);

  // A page is ONE subject — end the session so a re-open starts fresh.
  await finishQuiz(quiz);

  return NextResponse.json({ ok: true, todos: result.todos, done: true });
}
