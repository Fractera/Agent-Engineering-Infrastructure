import { type NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject, listNodes } from "@/lib/nodes";
import { ENTITY_TYPES, setWarning, listWarnings, type EntityType, type EntityWarning } from "@/lib/entity-store";

// THE WARNING WRITE/READ PATH (step 246; three-layer contract in step 247) — the agent→owner escalation
// channel. A coding agent that hits a hard external blocker POSTs a structured warning here INSTEAD of
// burning tokens on hopeless retries (the decision ladder in the architecture bundle's
// agent_instruction/NODES_INSTRUCTION points at this route).
//
// Validation IS the humanization gate (step 247): the owner-facing layer (`subject` + `blocker`) is
// length-capped so an agent physically cannot dump a technical wall on a non-technical owner — anything
// long belongs in `hermesInstruction` (the copyable technical brief). One warning = one blocker; a bundle
// of questions must be split into separate warnings (one per object, or answered one at a time).
//
// GET lists an automation's open warnings — the problems modal and the ⚠ badge read it. Rows are enriched
// with a human `label` (the node's name) so the UI never shows a raw cuid to the owner.

const KINDS = ["hermes-scout", "owner-decision", "external-service"] as const;
const SUBJECT_MAX = 120;   // ≤10 words of plain language
const BLOCKER_MAX = 500;   // 1-3 sentences; a wall of text gets rejected, not rendered

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const [warnings, nodes] = await Promise.all([listWarnings(proj.automation), listNodes(proj.automation)]);
  const nodeNames = new Map(nodes.map((n) => [n.cuid, n.name]));
  return NextResponse.json({
    warnings: warnings.map((w) => ({ ...w, label: nodeNames.get(w.ref) ?? "" })),
  });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as {
    automation?: string; entityType?: string; ref?: string; warning?: Partial<EntityWarning>;
  };
  const proj = resolveProject(String(body.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const entityType = body.entityType as EntityType;
  if (!ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: `unknown entityType (expected one of: ${ENTITY_TYPES.join(", ")})` }, { status: 400 });
  }
  const w = body.warning ?? {};
  const subject = typeof w.subject === "string" ? w.subject.trim() : "";
  if (!subject) {
    return NextResponse.json({ error: "warning.subject is required — ≤10 plain words in the owner's language naming WHAT was asked for (e.g. \"интеграция с Google Calendar\")" }, { status: 400 });
  }
  if (subject.length > SUBJECT_MAX) {
    return NextResponse.json({ error: `warning.subject is too long (${subject.length} > ${SUBJECT_MAX} chars) — it is a short name of the need, not a description` }, { status: 400 });
  }
  const blocker = typeof w.blocker === "string" ? w.blocker.trim() : "";
  if (!blocker) return NextResponse.json({ error: "warning.blocker (1-3 plain sentences for a non-technical owner) is required" }, { status: 400 });
  if (blocker.length > BLOCKER_MAX) {
    return NextResponse.json({ error: `warning.blocker is too long (${blocker.length} > ${BLOCKER_MAX} chars). It must stay 1-3 plain sentences a non-technical owner reads in one glance; move ALL technical detail into warning.hermesInstruction. One warning = one blocker — if you have several problems, write several warnings.` }, { status: 400 });
  }
  const kind = w.kind as EntityWarning["kind"];
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: `warning.kind must be one of: ${KINDS.join(", ")}` }, { status: 400 });
  }
  const hermesInstruction = typeof w.hermesInstruction === "string" ? w.hermesInstruction.trim() : "";
  if (kind === "hermes-scout" && !hermesInstruction) {
    return NextResponse.json({ error: "kind hermes-scout requires warning.hermesInstruction — the full ready first-person brief the owner copies to the Hermes agent: context (what we build) -> what we tried -> why it failed -> what to do -> what to return" }, { status: 400 });
  }
  await setWarning(proj.automation, entityType, String(body.ref ?? ""), {
    subject, blocker, kind,
    hermesInstruction: hermesInstruction || undefined,
    expectedAnswer: typeof w.expectedAnswer === "string" ? w.expectedAnswer.trim() || undefined : undefined,
  });
  return NextResponse.json({ ok: true });
}
