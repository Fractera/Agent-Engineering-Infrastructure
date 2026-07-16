import { type NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { ENTITY_TYPES, setSummary, type EntityType } from "@/lib/entity-store";

// THE SUMMARY WRITE PATH (owner 2026-07-16 — the rawRequest/summary refactor). A coding agent finishing an
// entity's development writes the compact "how it works now" here — ≤300 characters, in the OWNER's language
// (the general agent_instruction in the architecture bundle points at this exact route). One route for all
// entity types, mirroring the one-shape read side. An edge belongs to no single automation — its summary is
// stored under automation:'' (the same convention its history rows use).

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
  await setSummary(storeAutomation, entityType, String(body.ref ?? ""), summary);
  return NextResponse.json({ ok: true });
}
