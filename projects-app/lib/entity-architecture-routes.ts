import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { extractEntitySlice } from "@/lib/entity-architecture";
import { setTransport, getTransport, archiveAndClearTransport, type EntityType } from "@/lib/entity-store";
import { materializeStubEntityStep, nextStepNumber, type StubEntityStepKind } from "@/lib/dev-steps";
import { assertUseCasesReviewed } from "@/lib/use-cases";

// ROUTE FACTORY (step 238) — the 27 per-entity sub-APIs (add-new-transport-task-entry /
// extract-current-state-for-architecture / extract-full-history-for-architecture, one triad per entity)
// all share this same three handlers; each of the 27 route.ts files is a ~4-line binding to one entityType.
// `ref` scopes a specific instance (a node/edge/use-case cuid) for the 3 per-instance entities; the other 6
// entities are automation-wide and ignore it (always '').

export function extractCurrentRoute(entityType: EntityType) {
  return async function GET(req: NextRequest) {
    if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
    if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
    const slice = await extractEntitySlice(entityType, proj.automation, false);
    return NextResponse.json(slice);
  };
}

export function extractFullRoute(entityType: EntityType) {
  return async function GET(req: NextRequest) {
    if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
    if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
    const slice = await extractEntitySlice(entityType, proj.automation, true);
    return NextResponse.json(slice);
  };
}

export function addTransportRoute(entityType: EntityType) {
  return async function POST(req: NextRequest) {
    if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const body = (await req.json().catch(() => null)) as { automation?: string; ref?: string; payload?: unknown } | null;
    const proj = resolveProject(String(body?.automation ?? ""));
    if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
    const ref = String(body?.ref ?? "");
    // A plain DRAFT overwrite — nothing is archived here (step 238 Phase 2 correction, same fix applied to
    // the chain brief's PATCH). Archiving belongs at the point the brief is actually HANDED to a coding
    // agent (the entity's own .../start-development route), never at a draft-save: archiving on every save
    // would create a phantom history entry for every edit the owner makes while still drafting, even if
    // "Start development" is never clicked.
    await setTransport(proj.automation, entityType, ref, body?.payload ?? {});
    return NextResponse.json({ ok: true });
  };
}

/** "Start development" for a Dashboard/Analytics/Calendar/Map/Processes requirement (step 238 Phase 2) —
 *  the REAL "handed to a coding agent" event for these 5 entities, mirroring chain-spec/start-development
 *  exactly (same use-cases gate, same materialize-then-archive-then-clear order). Before this route existed,
 *  RequirementBriefPanel's transport was a dead end — nothing ever read it to spawn a Development Step. */
export function stubStartDevelopmentRoute(entityType: StubEntityStepKind) {
  return async function POST(req: NextRequest) {
    if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const body = (await req.json().catch(() => null)) as { automation?: string } | null;
    const proj = resolveProject(String(body?.automation ?? ""));
    if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

    // THE USE-CASES GATE (step 236.5 pattern, "copy the logic") — no development step is handed to a coding
    // agent until the owner has read the automation's user cases back and confirmed the AI understood him.
    const gate = await assertUseCasesReviewed(proj.automation);
    if (!gate.ok) return NextResponse.json({ reason: gate.reason }, { status: 409 });

    const transport = await getTransport(proj.automation, entityType, "");
    const brief = (transport?.payload as { brief?: string } | undefined)?.brief ?? "";

    const number = await nextStepNumber();
    const { file, message } = await materializeStubEntityStep({ number, automation: proj.automation, entityType, brief });

    // ARCHIVE + CLEAR here, not on save — this IS the real consumption event. Reuses the generic
    // entity_transport → entity_history archival Phase 0 already built but never wired to anything.
    await archiveAndClearTransport(proj.automation, entityType, "", String(number));

    return NextResponse.json({ ok: true, number, file, message });
  };
}
