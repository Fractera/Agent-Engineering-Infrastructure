import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { clearTransport, listTransports } from "@/lib/entity-store";
import { readChainSpec, writeChainSpec } from "@/lib/edges";
import { pendingWaveStep } from "@/lib/wave";

// RESET THE STAGED REQUIREMENTS (step 241 E3.3, owner's request) — the wave banner's "Reset".
//
// The owner has been writing requirements across several entities (a dashboard ask, an analytics ask, a chain
// brief, a node optimization…) and decides the whole batch was wrong. Without this he would have to empty
// each panel by hand. Reset clears them ALL, for every entity of this automation, in one action.
//
// IT ERASES, IT DOES NOT ARCHIVE. Archiving belongs to work that was actually HANDED OVER to a coding agent;
// a requirement thrown away before it was ever sent was never part of any development, and writing it into
// entity_history would recreate exactly the phantom-version bug step 238 Phase 2 removed.
//
// WHAT IT DOES NOT TOUCH — and the UI says so plainly rather than pretending: DRAFT NODES and USE CASES. A
// draft node is a node (deleting it would delete a piece of the diagram, which belongs in the Builder's own
// delete), and a use case is a scenario the automation must satisfy, not a development request. Reset is
// about the BRIEFS the owner wrote, and nothing else.
//
// REFUSED WHILE LOCKED: if a wave is already with a coding agent, its briefs are what he is working from —
// they may not vanish under him. (The page's lock already blocks the UI; this is the server-side twin.)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const locked = await pendingWaveStep(proj.automation);
  if (locked) {
    return NextResponse.json({ reason: "locked", step: locked.number }, { status: 409 });
  }

  const pending = await listTransports(proj.automation);
  for (const t of pending) {
    await clearTransport(proj.automation, t.entityType, t.ref);
  }

  // The chain brief is not in entity_transport — it is the group's own chain-spec.md file.
  let chainCleared = false;
  if ((await readChainSpec(proj.automation)).trim()) {
    await writeChainSpec(proj.automation, "");
    chainCleared = true;
  }

  return NextResponse.json({
    ok: true,
    cleared: pending.length + (chainCleared ? 1 : 0),
    entities: pending.map((t) => t.entityType),
  });
}
