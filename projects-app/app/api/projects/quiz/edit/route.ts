import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createNodeId } from "@/lib/cuid";
import { authorize } from "@/lib/nodes";
import { addTurnAt, getPhase, getQuizFor, resolveQuizTarget, USECASES_TURN_INDEX } from "@/lib/quiz";

// The owner EDITS what the model wrote (step 227.B; both subjects since 225 G4). During Auto-Quiz the
// model's text area is interactive: the owner pauses, rewrites a sentence, and resumes. The edited text
// REPLACES the model's last turn — so the node (or the link) is synthesized from what the OWNER approved,
// not from what the model happened to say.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; edge?: string; useCase?: string; cases?: boolean; content?: string; asOwner?: boolean }
    | null;
  const t = await resolveQuizTarget({
    automation: body?.automation, edge: body?.edge, useCase: body?.useCase, cases: body?.cases,
  });
  if (!t.ok) return NextResponse.json({ error: t.error }, { status: 400 });
  const content = String(body?.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const quiz = await getQuizFor(t.target);
  if (!quiz) return NextResponse.json({ error: "quiz not started" }, { status: 400 });

  // The turn we replace belongs to the CURRENT phase (step 231): the use-case interview is stored at index
  // -1, node #N at N — so an edit during the scenarios never overwrites a node's brainstorm.
  const index =
    (await getPhase(quiz, t.target)) === "usecases" ? USECASES_TURN_INDEX : quiz.node_count;

  // THE OWNER ADOPTS THE TEXT (step 231). In the use-case phase, keeping an auto-quiz draft is the owner
  // SPEAKING — he read it live and made it his description. It is stored as HIS turn, which is also what
  // satisfies the skip-refusal in /quiz/usecases-apply (the one-line instruction he typed at creation never
  // does: deriving cases from it alone is the shortcut this phase exists to forbid).
  if (body?.asOwner) {
    await addTurnAt(quiz, index, "user", content);
    return NextResponse.json({ ok: true, asOwner: true });
  }

  const last = (await db
    .prepare(
      `SELECT id FROM automation_quiz_turns WHERE quiz_id = ? AND node_index = ? AND role = 'assistant'
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(quiz.id, index)) as { id: string } | undefined;

  if (last) {
    await db.prepare(`UPDATE automation_quiz_turns SET content = ? WHERE id = ?`).run(content, last.id);
  } else {
    await db.prepare(`INSERT INTO automation_quiz_turns (id, quiz_id, node_index, role, content) VALUES (?, ?, ?, 'assistant', ?)`)
      .run(createNodeId(), quiz.id, index, content);
  }
  return NextResponse.json({ ok: true });
}
