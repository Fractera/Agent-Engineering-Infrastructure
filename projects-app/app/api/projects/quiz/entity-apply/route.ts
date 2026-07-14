import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import {
  entityContext, entityQuizKey, finishQuiz, getQuizByKey, synthesizeEntity, turnsOf,
} from "@/lib/quiz";
import { setTransport, type EntityType } from "@/lib/entity-store";

// "Add with AI" closing move for an ENTITY (step 239) — the entity equivalent of quiz/edge-apply, but
// SIMPLER: it does NOT dispatch a development step and does NOT touch a version. The brainstorm becomes the
// entity's REQUIREMENT TEXT, written into that entity's transport container (the same slot the Requirement
// panel's textarea saves to) — dispatch stays a SEPARATE action (the page-level wave, step 240). So this
// route: (1) synthesizes the requirement from the transcript, (2) setTransport into entity_transport (a plain
// draft overwrite, nothing archived — archiving happens only when the wave is actually handed off), (3) ends
// the session (an entity requirement is one subject, no "next"). The panel re-reads the container on close.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; entity?: string } | null;
  const entityType = String(body?.entity ?? "").trim();
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  if (!entityType) return NextResponse.json({ error: "entity is required" }, { status: 400 });

  const quiz = await getQuizByKey(entityQuizKey(proj.automation, entityType));
  if (!quiz) return NextResponse.json({ error: "quiz not started" }, { status: 400 });

  const seed = await entityContext(proj.automation, proj.projectDir, entityType);
  const turns = await turnsOf(quiz);

  let result: { brief: string };
  try {
    result = await synthesizeEntity(quiz, seed, turns);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  // A plain draft overwrite of the entity's transport (ref='' — these entities are automation-wide). Nothing
  // is archived here: archiving belongs to the wave hand-off (step 240), never to a draft write.
  await setTransport(proj.automation, entityType as EntityType, "", { brief: result.brief });

  // An entity requirement is ONE subject — end the session so a re-open starts fresh.
  await finishQuiz(quiz);

  return NextResponse.json({ ok: true, brief: result.brief, done: true });
}
