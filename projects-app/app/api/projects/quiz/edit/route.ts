import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorize, resolveProject } from "@/lib/nodes";
import { getQuiz } from "@/lib/quiz";

// The owner EDITS what the model wrote (step 227.B). During Auto-Quiz the model's text area is interactive:
// the owner pauses, rewrites a sentence, and resumes. The edited text REPLACES the model's last turn — so
// the node is synthesized from what the OWNER approved, not from what the model happened to say.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; content?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const content = String(body?.content ?? "").trim();
  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const quiz = await getQuiz(proj.automation);
  if (!quiz) return NextResponse.json({ error: "quiz not started" }, { status: 400 });

  const last = (await db
    .prepare(
      `SELECT id FROM automation_quiz_turns WHERE quiz_id = ? AND node_index = ? AND role = 'assistant'
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(quiz.id, quiz.node_count)) as { id: string } | undefined;

  if (last) {
    await db.prepare(`UPDATE automation_quiz_turns SET content = ? WHERE id = ?`).run(content, last.id);
  } else {
    await db.prepare(`INSERT INTO automation_quiz_turns (id, quiz_id, node_index, role, content) VALUES (?, ?, ?, 'assistant', ?)`)
      .run(crypto.randomUUID(), quiz.id, quiz.node_count, content);
  }
  return NextResponse.json({ ok: true });
}
