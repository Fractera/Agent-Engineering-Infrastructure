import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize } from "@/lib/nodes";
import { edgeByCuid, writeEdgeSpec } from "@/lib/edges";
import { materializeEdgeStep, nextStepNumber } from "@/lib/dev-steps";
import { edgeContext, finishQuiz, getQuizByKey, edgeQuizKey, synthesizeEdge, turnsOf } from "@/lib/quiz";

// "Write the link brief → development step" (step 225 G4) — the EDGE's equivalent of the node Quiz's
// /next-node. It closes the link brainstorm and, in ONE call:
//   1. synthesizes the link from the transcript (name + the brief the coding agent will build from),
//   2. writes it into the edge's OWN spec.md (the same file the link panel edits — never a second store),
//   3. materializes ONE development step for it in DEVELOPMENT-STEPS/NEW-STEPS/ (the product's own queue,
//      read by :3002/service/development-steps and by the full-auto agent) — the SAME materializeEdgeStep
//      the panel's "Start development" uses; no new step mechanism exists anywhere,
//   4. finishes the quiz (a link is ONE subject — there is no "next link" to walk to).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { edge?: string } | null;
  const cuid = String(body?.edge ?? "").trim();
  if (!cuid) return NextResponse.json({ error: "edge is required" }, { status: 400 });

  const edge = await edgeByCuid(cuid);
  if (!edge) return NextResponse.json({ error: "edge not found" }, { status: 404 });

  const quiz = await getQuizByKey(edgeQuizKey(cuid));
  if (!quiz) return NextResponse.json({ error: "quiz not started" }, { status: 400 });

  const seed = await edgeContext(cuid);
  const turns = await turnsOf(quiz);

  let link: { name: string; spec: string };
  try {
    link = await synthesizeEdge(quiz, seed, turns);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  // 2. the brief goes into the edge's own file — the panel reads exactly this.
  await writeEdgeSpec(cuid, link.spec);
  // The model's name is adopted only while the link is still a DRAFT (a built link keeps the name the owner
  // and the canvas already know).
  if (link.name && edge.draft === 1) {
    await db.prepare(`UPDATE automation_edges SET name = ?, updated_at = datetime('now') WHERE cuid = ?`)
      .run(link.name, cuid);
  }

  // 3. one development step for this link (the existing file queue — no new mechanism)
  const number = await nextStepNumber();
  const { message } = await materializeEdgeStep({
    number,
    edgeCuid: cuid,
    name: link.name || edge.name,
    from: edge.from_automation,
    to: edge.to_automation,
    fromNode: edge.from_node_cuid,
    toNode: edge.to_node_cuid,
    spec: link.spec,
    targetVersion: edge.latest_version + 1,
  });

  // 4. a link is one subject — the session ends here.
  await finishQuiz(quiz);

  return NextResponse.json({
    ok: true,
    edge: { cuid, name: link.name || edge.name, spec: link.spec },
    step: { number, message },
    done: true,
  });
}
