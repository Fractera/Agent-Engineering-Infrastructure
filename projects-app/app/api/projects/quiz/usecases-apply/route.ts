import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import {
  addTurnFor, automationInstruction, getPhase, getQuiz, nextQuestionFor, setPhase, synthesizeUseCases,
  turnsFor,
} from "@/lib/quiz";
import { addCase, listCases, regenerateUseCasesFile } from "@/lib/use-cases";

// PHASE 1 → PHASE 2 (step 231) — the owner has described the scenarios and presses "The cases are ready".
// In ONE call:
//   1. the interview is synthesized into NUMBERED user cases (title + summary, status `new`),
//   2. they are written to the store and the project's _data/use-cases.ts is regenerated,
//   3. the Quiz switches to the node phase and asks the first question about node #1.
//
// THE GATE: if the conversation produced nothing to turn into a case, the switch is REFUSED (409). This is
// the owner's rule made mechanical — an automation cannot be created without a detailed description, and
// the refusal says exactly that instead of quietly moving on.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const quiz = await getQuiz(proj.automation);
  if (!quiz) return NextResponse.json({ error: "quiz not started" }, { status: 400 });
  const target = { kind: "project" as const, key: proj.automation, automation: proj.automation, projectDir: proj.projectDir };
  if ((await getPhase(quiz, target)) === "nodes") {
    return NextResponse.json({ ok: true, phase: "nodes", cases: await listCases(proj.automation) });
  }

  const instruction = await automationInstruction(proj.projectDir);
  const turns = await turnsFor(quiz, target);
  // THE SKIP-REFUSAL (owner's rule, proven on the server): the OWNER must have described the scenarios. The
  // greeting is ours, and the one-line instruction he typed when creating the automation is NOT a
  // description — deriving cases from it alone is exactly the shortcut this step exists to forbid. An
  // auto-quiz counts only when he KEPT its text ("Keep this text" saves it as a turn he owns).
  const spoke = turns.some((t) => t.role === "user" && t.content.trim().length >= 20);
  if (!spoke) {
    return NextResponse.json(
      {
        error:
          "Describe the scenarios first — without a detailed description the automation cannot be created. " +
          "Tell me who uses it, what comes in, what must come out, and what happens when something goes wrong.",
      },
      { status: 409 },
    );
  }

  let cases: { title: string; summary: string }[];
  try {
    cases = await synthesizeUseCases(quiz, instruction, turns);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
  if (!cases.length) {
    return NextResponse.json(
      {
        error:
          "I could not turn this into a single user case yet — the description is still too thin. Say more " +
          "about the scenarios: who triggers the automation, what it receives, and what it must produce.",
      },
      { status: 409 },
    );
  }

  for (const c of cases) await addCase(proj.automation, { title: c.title, summary: c.summary, status: "new" });
  await regenerateUseCasesFile(proj.projectDir, proj.automation);

  // Phase 2 — the nodes. Ask the first question about node #1 right away, so the session never stalls.
  await setPhase(quiz, "nodes");
  const fresh = (await getQuiz(proj.automation))!;
  let question: string | null = null;
  try {
    question = await nextQuestionFor(fresh, target, instruction, []);
    await addTurnFor(fresh, target, "assistant", question);
  } catch { question = null; }

  return NextResponse.json({
    ok: true,
    phase: "nodes",
    cases: await listCases(proj.automation),
    question,
  });
}
