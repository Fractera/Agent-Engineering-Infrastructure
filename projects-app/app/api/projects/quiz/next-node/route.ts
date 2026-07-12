import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createNodeId } from "@/lib/cuid";
import { db } from "@/lib/db";
import { draftNodeStubFiles } from "@/app/(projects)/projects/_lib/draft-node-stub";
import {
  authorize, resolveProject, syncIndexFromFiles, nextOrd, uniqueSlug, regenerateDiagram, liveSlugsInOrder,
} from "@/lib/nodes";
import { materializeNodeStep, nextStepNumber } from "@/lib/dev-steps";
import {
  addTurn, advanceNode, automationInstruction, getPhase, getQuiz, nextQuestion, synthesizeNode, t, turnsOf,
  QUIZ_MAX_NODES,
} from "@/lib/quiz";
import { assertUseCasesReviewed } from "@/lib/use-cases";

// "Finish this node → go to the next" (step 227) — the heart of the Quiz. It closes the current brainstorm
// and, in ONE call:
//   1. synthesizes the node from the transcript (name + the brief the coding agent will build from),
//   2. creates it as a real DRAFT node (the same stub the Builder writes — one code path, step 224),
//   3. materializes ONE development sub-step for it in DEVELOPMENT-STEPS/NEW-STEPS/ (the product's own
//      queue, read by :3002/service/development-steps and by the full-auto agent),
//   4. advances the quiz and asks the FIRST question of the NEXT node — unless the 10-node cap is reached
//      (the context-overflow guard), in which case the quiz is done and the owner is told where it stands.
// The owner may press this at ANY moment — the brainstorm never has to "finish" first.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const quiz = await getQuiz(proj.automation);
  if (!quiz) return NextResponse.json({ error: "quiz not started" }, { status: 400 });
  if (quiz.status === "done") return NextResponse.json({ error: "quiz already finished" }, { status: 400 });

  // THE USER-CASE GATE (step 231). A node — and the development step it hands to the coding agent — cannot
  // exist before the scenarios do, and before the owner has read them back and confirmed the AI understood
  // him. Both refusals are explicit (409 + the reason), never a silent skip.
  const target = { kind: "project" as const, key: proj.automation, automation: proj.automation, projectDir: proj.projectDir };
  if ((await getPhase(quiz, target)) === "usecases") {
    return NextResponse.json(
      { error: t("describeFirst", quiz.language), reason: "usecases-phase" },
      { status: 409 },
    );
  }
  const gate = await assertUseCasesReviewed(proj.automation);
  if (!gate.ok) {
    const error = t(gate.reason === "no-cases" ? "noCases" : "notReviewed", quiz.language);
    return NextResponse.json({ error, reason: gate.reason }, { status: 409 });
  }

  const instruction = await automationInstruction(proj.projectDir);
  const turns = await turnsOf(quiz);

  let node: { name: string; spec: string; estDurationMs: number };
  try {
    node = await synthesizeNode(quiz, instruction, turns);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  // 2. the node — the SAME draft stub the Builder creates (never a second code path)
  await syncIndexFromFiles(proj.automation, proj.projectDir);
  const slug = await uniqueSlug(node.name, proj.projectDir);
  const cuid = createNodeId();
  const ord = await nextOrd(proj.automation);
  const nodeDir = join(proj.projectDir, "_nodes", slug);
  await mkdir(nodeDir, { recursive: true });
  for (const [rel, content] of Object.entries(draftNodeStubFiles({ cuid, slug, name: node.name, spec: node.spec, estDurationMs: node.estDurationMs }))) {
    await writeFile(join(nodeDir, rel), content, "utf8");
  }
  await db.prepare(
    `INSERT INTO automation_nodes (cuid, automation, slug, name, ord, draft, active_version, latest_version, status)
     VALUES (?, ?, ?, ?, ?, 1, 0, 0, 'draft')`,
  ).run(cuid, proj.automation, slug, node.name, ord);
  await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(proj.automation));

  // 3. one development sub-step for this node
  const number = await nextStepNumber();
  const { message } = await materializeNodeStep({
    number, automation: proj.automation, nodeCuid: cuid, nodeSlug: slug, nodeName: node.name,
    spec: node.spec, optimization: false, targetVersion: 1,
  });

  // 4. advance; ask the first question of the next node unless the cap is reached
  const { done, nodeCount } = await advanceNode(quiz);
  let question: string | null = null;
  if (!done) {
    const fresh = await getQuiz(proj.automation);
    if (fresh) {
      try {
        question = await nextQuestion(fresh, instruction, []);
        await addTurn(fresh, "assistant", question);
      } catch { question = null; }
    }
  }

  return NextResponse.json({
    ok: true,
    node: { cuid, slug, name: node.name, spec: node.spec },
    step: { number, message },
    nodeCount,
    maxNodes: QUIZ_MAX_NODES,
    done,
    question,
  });
}
