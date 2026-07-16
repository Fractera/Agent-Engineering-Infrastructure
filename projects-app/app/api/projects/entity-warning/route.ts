import { type NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { ENTITY_TYPES, setWarning, listWarnings, type EntityType, type EntityWarning } from "@/lib/entity-store";

// THE WARNING WRITE/READ PATH (step 246) — the agent→owner escalation channel. A coding agent that hits a
// hard external blocker POSTs a structured warning here INSTEAD of burning tokens on hopeless retries (the
// decision ladder in the architecture bundle's agent_instruction/NODES_INSTRUCTION points at this route).
// GET lists an automation's open warnings — the problems modal and the ⚠ badge read it.

const KINDS = ["hermes-scout", "owner-decision", "external-service"] as const;

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  return NextResponse.json({ warnings: await listWarnings(proj.automation) });
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
  const blocker = typeof w.blocker === "string" ? w.blocker.trim() : "";
  if (!blocker) return NextResponse.json({ error: "warning.blocker (1-2 sentences) is required" }, { status: 400 });
  const kind = w.kind as EntityWarning["kind"];
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: `warning.kind must be one of: ${KINDS.join(", ")}` }, { status: 400 });
  }
  const hermesInstruction = typeof w.hermesInstruction === "string" ? w.hermesInstruction.trim() : "";
  if (kind === "hermes-scout" && !hermesInstruction) {
    return NextResponse.json({ error: "kind hermes-scout requires warning.hermesInstruction — the full ready instruction the owner copies to the Hermes agent" }, { status: 400 });
  }
  await setWarning(proj.automation, entityType, String(body.ref ?? ""), {
    blocker, kind,
    hermesInstruction: hermesInstruction || undefined,
    expectedAnswer: typeof w.expectedAnswer === "string" ? w.expectedAnswer.trim() || undefined : undefined,
  });
  return NextResponse.json({ ok: true });
}
