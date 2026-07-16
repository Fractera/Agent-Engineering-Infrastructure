import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { setWaveSnooze, clearWaveSnooze } from "@/lib/entity-store";
import { stagedItems, waveSignature } from "@/lib/wave";

// POSTPONE THE WAVE BANNER (step 241 E3.3, owner's "Отложить запуск") — the middle of the banner's three
// actions. It is NOT "Cancel" (which erases the requirements) and NOT a mere client-side hide (which would
// come back on reload): it FREEZES the current staged state as "not worth a notification" and hides the
// banner until that state actually changes.
//
// How: we store a SIGNATURE of the staged requirements right now (lib/wave.ts computes it). waveOf() then
// reports `snoozed: true` for as long as the live signature still equals this one, and the banner stays
// hidden — across reloads, across sessions. The moment the owner adds, edits or removes ANY requirement on
// ANY entity, the signature no longer matches and the banner returns on its own. Nothing is lost meanwhile:
// the requirements are all still staged, they are simply not nagging.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const items = await stagedItems(proj.automation);
  // Nothing staged → nothing to postpone; report it plainly rather than storing a signature of "empty".
  if (!items.length) return NextResponse.json({ ok: true, snoozed: false });

  await setWaveSnooze(proj.automation, waveSignature(items));
  return NextResponse.json({ ok: true, snoozed: true });
}

// UN-POSTPONE (step 247, owner's fix): the postponed banner had NO way back — hover mishaps hid the launch
// invitation for good. The status bar's "Launch development" button calls this to clear the snooze; the
// banner returns on the next poll with everything still staged.
export async function DELETE(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  await clearWaveSnooze(proj.automation);
  return NextResponse.json({ ok: true, snoozed: false });
}
