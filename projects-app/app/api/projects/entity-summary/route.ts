import { type NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import {
  ENTITY_TYPES, setSummary, archiveAndClearTransport, setLifecycleState, listWarnings, type EntityType,
} from "@/lib/entity-store";

// THE SUMMARY WRITE PATH (owner 2026-07-16 — the rawRequest/summary refactor). A coding agent finishing an
// entity's development writes the compact "how it works now" here — ≤300 characters, in the OWNER's language
// (the general agent_instruction in the architecture bundle points at this exact route). One route for all
// entity types, mirroring the one-shape read side. An edge belongs to no single automation — its summary is
// stored under automation:'' (the same convention its history rows use).
//
// PER-OBJECT CLOSURE (step 249, the light hand-off flow): writing the summary IS finishing the object — so
// this route also archives the object's pending brief (rawRequest → entity_history) and clears the container,
// and asserts the lifecycle flag: something really landed, the graph is no longer the shipped demo. No global
// wave-complete is needed anymore; a warning and a summary stay mutually exclusive (agent_instruction), so an
// object with an OPEN warning is refused here — resolve or withdraw the warning first.

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as {
    automation?: string; entityType?: string; ref?: string; summary?: string;
  };
  const proj = resolveProject(body.automation ?? "");
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const entityType = body.entityType as EntityType;
  if (!ENTITY_TYPES.includes(entityType)) {
    return NextResponse.json({ error: `unknown entityType (expected one of: ${ENTITY_TYPES.join(", ")})` }, { status: 400 });
  }
  const summary = typeof body.summary === "string" ? body.summary.trim() : null;
  if (summary === null) return NextResponse.json({ error: "summary must be a string" }, { status: 400 });
  if (summary.length > 300) {
    return NextResponse.json({ error: `summary must be ≤300 characters (got ${summary.length}) — compress it` }, { status: 400 });
  }
  const storeAutomation = entityType === "edge" ? "" : proj.automation;
  const ref = String(body.ref ?? "");

  // A summary means "done" — and done is incompatible with an open warning on the same object.
  const open = await listWarnings(storeAutomation);
  if (open.some((w) => w.entityType === entityType && w.ref === ref)) {
    return NextResponse.json(
      { error: "this object carries an OPEN warning — a summary and a warning are mutually exclusive; resolve the warning first" },
      { status: 409 },
    );
  }

  await setSummary(storeAutomation, entityType, ref, summary);
  // Close the object (step 249): its brief moves to entity_history, the container empties, and the
  // lifecycle flag records that work really landed.
  await archiveAndClearTransport(storeAutomation, entityType, ref);
  if (entityType !== "edge") await setLifecycleState(proj.automation, "real-automation");
  return NextResponse.json({ ok: true, closed: true });
}
