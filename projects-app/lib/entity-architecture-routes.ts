import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { extractEntitySlice } from "@/lib/entity-architecture";
import { setTransport, type EntityType } from "@/lib/entity-store";

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

// STEP 240 — `stubStartDevelopmentRoute` (the per-entity "Start development" of step 238 Phase 2) is GONE,
// together with the six routes that bound it. Per-entity dispatch does not exist any more: a requirement is
// SAVED (staged), and the page's single wave banner hands EVERY staged change over as ONE development step
// (app/api/projects/start-development + lib/wave.ts). Keeping these routes alive would have left a path
// around the page lock — a brief could be dispatched while a wave was already with a coding agent.
