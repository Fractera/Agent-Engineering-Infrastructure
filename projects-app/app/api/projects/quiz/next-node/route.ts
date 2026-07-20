import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { createNodeId } from "@/lib/cuid";
import { draftNodeStubFiles } from "@/app/(projects)/projects/_lib/draft-node-stub";
import {
  authorize, resolveProject, syncIndexFromFiles, uniqueSlug, regenerateDiagram, liveSlugsInOrder, registerNode,
} from "@/lib/nodes";
import {
  addTurn, advanceNode, automationInstruction, getPhase, getQuiz, nextQuestion, synthesizeNode, t, turnsOf,
  QUIZ_MAX_NODES,
} from "@/lib/quiz";

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

  // THE PHASE GATE (step 231): nodes cannot be designed before the scenarios exist — the use-case phase must
  // finish first. The REVIEW gate (read + confirm the cases) moved to "Start development" (step 233): a node
  // is now just a draft, so designing one no longer needs the confirmation — that belongs at the handoff.
  const target = { kind: "project" as const, key: proj.automation, automation: proj.automation, projectDir: proj.projectDir };
  if ((await getPhase(quiz, target)) === "usecases") {
    return NextResponse.json(
      { error: t("describeFirst", quiz.language), reason: "usecases-phase" },
      { status: 409 },
    );
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
  const nodeDir = join(proj.projectDir, "_nodes", slug);
  await mkdir(nodeDir, { recursive: true });
  const hasOwnTypes = await stat(join(proj.projectDir, "_types", "node-contract.ts")).then(() => true).catch(() => false);
  for (const [rel, content] of Object.entries(draftNodeStubFiles({ cuid, slug, name: node.name, spec: node.spec, estDurationMs: node.estDurationMs, hasOwnTypes }))) {
    await writeFile(join(nodeDir, rel), content, "utf8");
  }
  await registerNode(proj.automation, { cuid, slug, name: node.name, draft: true });
  await regenerateDiagram(proj.projectDir, await liveSlugsInOrder(proj.automation));

  // Finishing a node creates the DRAFT node ONLY (step 233 model change). It no longer materializes a
  // per-node development step: the single handoff is now "Start development", which bundles every draft node
  // into ONE step (sub-steps = nodes) with the ordered read-first brief. Nodes accumulate as drafts here.

  // Advance; ask the first question of the next node unless the cap is reached.
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
    nodeCount,
    maxNodes: QUIZ_MAX_NODES,
    done,
    question,
  });
}
