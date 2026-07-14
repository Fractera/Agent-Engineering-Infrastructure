import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { extractEntitySlice } from "@/lib/entity-architecture";
import {
  setTransport, getTransport, writeVersionByRef, nextVersionByRef, nextVersionForAutomation,
  type EntityType,
} from "@/lib/entity-store";

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
    // ARCHIVE the OUTGOING transport before overwriting it — the "a new brief supersedes the old one, but
    // the old one is never lost" half of the step-238 standard (same rule P4 applied to the chain brief).
    // node/edge/usecase never call this route for their real content (each has its own bespoke transport —
    // files on disk or a review-gate field), so this only ever fires for entities that actually rely on the
    // generic entity_transport table (today: dashboard/analytics/calendar/map/processes, step 238 P5-P9).
    const prior = await getTransport(proj.automation, entityType, ref);
    if (prior && Object.keys((prior.payload as Record<string, unknown>) ?? {}).length > 0) {
      const version = ref
        ? await nextVersionByRef(entityType, ref)
        : await nextVersionForAutomation(proj.automation, entityType, ref);
      await writeVersionByRef(proj.automation, entityType, ref, version, prior.payload, null);
    }
    await setTransport(proj.automation, entityType, ref, body?.payload ?? {});
    return NextResponse.json({ ok: true });
  };
}
