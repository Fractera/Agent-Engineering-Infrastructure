import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { completeStep, readWaveStep } from "@/lib/dev-steps";
import { archiveAndClearTransport, setLifecycleState, listWarnings, type EntityType } from "@/lib/entity-store";
import { writeChainSpec, readChainSpec } from "@/lib/edges";
import { nextVersionForAutomation, writeVersionByRef } from "@/lib/entity-store";

// THE WAVE'S CLOSING CALL (step 240) — the coding agent's LAST task, after a SUCCESSFUL deploy.
//
// This is the owner's rule made mechanical: "the coder clears the briefs at the end and moves them into
// history." Until it is called, the owner's page stays LOCKED and every brief stays visible exactly as it was
// handed over — so the owner and the coder can never be looking at different text.
//
// It iterates the wave's OWN contents (the `wave: [{entityType, ref}]` list in the step file's machine block —
// materialize-first: the step file IS the wave) and, for each one:
//   • archives the pending brief into entity_history (the generic step-238 primitive) and clears the container,
//   • then closes the step file (NEW-STEPS -> COMPLETED-STEPS), which is what unlocks the page.
//
// Idempotent by construction: archiveAndClearTransport is a no-op once a container is empty, and completeStep
// tolerates an already-moved file. A second call therefore cannot double-archive or fail.
//
// NOTE on nodes/edges: they archive their OWN version snapshot in their materialize call (with this step as
// devStepRef), so nothing is archived twice here — their transport slot is not where their brief lives.
// The chain brief lives in its own file (chain-spec.md), so it gets the same archive-then-clear treatment
// explicitly.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { automation?: string; step?: number } | null;
  const proj = resolveProject(String(body?.automation ?? ""));
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const step = Number(body?.step);
  if (!Number.isFinite(step)) return NextResponse.json({ error: "step is required" }, { status: 400 });

  const wave = await readWaveStep(step);
  if (!wave) return NextResponse.json({ error: `development step #${step} not found` }, { status: 404 });
  if (wave.automation && wave.automation !== proj.automation) {
    return NextResponse.json({ error: `step #${step} belongs to ${wave.automation}, not ${proj.automation}` }, { status: 400 });
  }

  const archived: string[] = [];
  for (const item of wave.wave) {
    if (item.entityType === "chain") {
      // The chain brief is not in entity_transport — it is the group's own chain-spec.md file.
      const spec = await readChainSpec(proj.automation);
      if (spec.trim()) {
        const version = await nextVersionForAutomation(proj.automation, "chain");
        await writeVersionByRef(proj.automation, "chain", "", version, { brief: spec }, String(step));
        await writeChainSpec(proj.automation, "");
        archived.push("chain");
      }
      continue;
    }
    // node/edge/usecase archive their own version on materialize; the transport clear below is a harmless
    // no-op for them (their slot is empty) and the real work for the requirement entities.
    await archiveAndClearTransport(proj.automation, item.entityType as EntityType, item.ref ?? "", String(step));
    archived.push(`${item.entityType}${item.ref ? `:${item.ref}` : ""}`);
  }

  // Closing the step file is what UNLOCKS the page (locked ⟺ the wave step is still in NEW-STEPS/).
  const completed = await completeStep(step, `Wave completed — ${archived.length} staged change(s) archived.`);

  // THE LIFECYCLE FLIP (step 247, owner's design; guarded after the automation-14 live test): a completed
  // wave means the graph is no longer the shipped demo — UNLESS every single change of this wave ended
  // BLOCKED (an open warning on each item): then nothing was actually implemented and the graph is still
  // the demo, so the flag stays "starter-template" until a wave really lands something. Mechanical here
  // (never left to the agent's memory); idempotent, later waves just re-assert the state.
  const open = await listWarnings(proj.automation);
  const isBlocked = (t: string, r: string) => open.some((w) => w.entityType === t && w.ref === (r ?? ""));
  const fullyBlocked = wave.wave.length > 0 && wave.wave.every((it) => isBlocked(it.entityType, it.ref ?? ""));
  if (!fullyBlocked) await setLifecycleState(proj.automation, "real-automation");

  return NextResponse.json({
    ok: true, step, archived, completedStep: completed, unlocked: true,
    lifecycleState: fullyBlocked ? "starter-template" : "real-automation",
    ...(fullyBlocked ? { lifecycleNote: "every change of this wave is blocked by a warning — nothing was implemented, the graph is still the starter demo, the flag did not flip" } : {}),
  });
}
