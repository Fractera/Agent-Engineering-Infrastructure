import { type NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import {
  ENTITY_TYPES, getWarning, clearWarning, getTransport, setTransport,
  writeVersionByRef, nextVersionByRef, nextVersionForAutomation, type EntityType,
} from "@/lib/entity-store";

// THE WARNING ANSWER (step 246) — closes the escalation loop. The owner pastes the answer (the Hermes
// scout's report, or his own decision) and this route: (a) ARCHIVES the warning+answer pair to
// entity_history (the context an agent must read before re-attempting the object); (b) clears the warning
// row; (c) APPENDS to the object's rawRequest (transport slot) the text "В ответ на твой warning предоставляю
// следующую информацию: <answer>" — appends, never overwrites: the original task stays. A non-empty
// rawRequest then re-enters the wave, and the next development iteration passes the blocker.
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

  const warning = await getWarning(proj.automation, entityType, ref);
  if (!warning) return NextResponse.json({ error: "no open warning for this object" }, { status: 404 });

  // (a) archive the pair — CUID-scoped entities version by ref, automation-wide ones by automation.
  const cuidScoped = entityType === "node" || entityType === "edge" || entityType === "usecase";
  const version = cuidScoped
    ? await nextVersionByRef(entityType, ref)
    : await nextVersionForAutomation(proj.automation, entityType, ref);
  await writeVersionByRef(proj.automation, entityType, ref, version, { warning, answer }, null);

  // (b) the warning is answered — the object is no longer blocked.
  await clearWarning(proj.automation, entityType, ref);

  // (c) append the answer to the object's rawRequest. For a NODE the pending text may live in spec.md (a
  // draft) rather than the transport slot — the transport append still reaches the wave and the bundle
  // (the node extractor reads the transport for materialized nodes), which is the contract that matters.
  const current = await getTransport(proj.automation, entityType, ref);
  const p = (current?.payload ?? {}) as Record<string, unknown>;
  const answerLine = `В ответ на твой warning предоставляю следующую информацию: ${answer}`;
  if (entityType === "node") {
    const prev = typeof p.instruction === "string" ? p.instruction : "";
    await setTransport(proj.automation, entityType, ref, {
      ...p, instruction: prev ? `${prev}\n\n${answerLine}` : answerLine, spec: typeof p.spec === "string" ? p.spec : "",
    });
  } else {
    const prev = typeof p.brief === "string" ? p.brief : "";
    await setTransport(proj.automation, entityType, ref, { ...p, brief: prev ? `${prev}\n\n${answerLine}` : answerLine });
  }
  return NextResponse.json({ ok: true, archivedVersion: version });
}
