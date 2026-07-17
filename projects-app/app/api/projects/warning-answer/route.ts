import { type NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { ENTITY_TYPES, answerWarning, type EntityType } from "@/lib/entity-store";

// THE WARNING ANSWER (step 246) — closes the escalation loop. The owner pastes the answer (the Hermes
// scout's report, or his own decision) and the shared core (entity-store answerWarning, extracted in step
// 248 so the env setter can auto-resolve credential warnings through the same lifecycle): (a) ARCHIVES the
// warning+answer pair to entity_history (the context an agent must read before re-attempting the object);
// (b) clears the warning row; (c) APPENDS to the object's rawRequest (transport slot) the text "В ответ на
// твой warning предоставляю следующую информацию: <answer>" — appends, never overwrites: the original task
// stays. A non-empty rawRequest then re-enters the wave, and the next development iteration passes the blocker.
export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as {
    automation?: string; entityType?: string; ref?: string; answer?: string;
  };
  const proj = resolveProject(String(body.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const entityType = body.entityType as EntityType;
  if (!ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: `unknown entityType (expected one of: ${ENTITY_TYPES.join(", ")})` }, { status: 400 });
  }
  const ref = String(body.ref ?? "");
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  if (!answer) return NextResponse.json({ error: "answer is required" }, { status: 400 });

  const version = await answerWarning(proj.automation, entityType, ref, answer);
  if (version === null) return NextResponse.json({ error: "no open warning for this object" }, { status: 404 });
  return NextResponse.json({ ok: true, archivedVersion: version });
}
