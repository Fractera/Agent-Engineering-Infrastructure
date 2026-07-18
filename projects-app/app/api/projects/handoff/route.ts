import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { launchGate } from "@/lib/wave";

// THE LIGHT HAND-OFF (step 249) — the copyable task text the owner pastes into a coding-agent chat, in TWO
// modes matching the two buttons of the launch dialog:
//
//   full  — the FIRST session: an ADDRESS + a mandate (never a snapshot, step 233's principle): the agent
//           loads the architecture JSON itself, reads the doctrine, executes every pending object.
//   delta — a CONTINUATION of an ALREADY-WARM session: the agent holds the full context from its first
//           task, so re-pasting the whole JSON would only overflow it (owner 2026-07-17). The delta lists
//           exactly the staged objects (one or many — everything accumulated since the last hand-off) with
//           their briefs inline, and forbids reloading the full JSON.
//
// NO Development Step is materialized, NO lock is taken (owner's maximal minimalism): the UI shows a toast
// making the discipline explicit — hand the text over, then wait for the agent to finish before editing.
// Closing is PER-OBJECT (materialize / entity-summary / entity-warning), so nothing here needs cleaning up.
export const runtime = "nodejs";

const CLOSING = `HOW TO CLOSE EACH OBJECT (per-object, no global closing call):
- a node: write _nodes/<slug>/functions.ts (+ instruction.ts), then POST http://localhost:3003/api/projects/nodes/<cuid>/materialize {"summary":"<what it does now, owner's language, <=300 chars>"} — it compiles the node and puts it LIVE instantly (no rebuild; a compile error comes back in this call).
- any other object: implement it, then POST http://localhost:3003/api/projects/entity-summary {"automation":"<a>","entityType":"<t>","ref":"<ref>","summary":"..."} — this archives its brief and closes it.
- a BLOCKED object: POST http://localhost:3003/api/projects/entity-warning (kinds and layers — see the JSON's agent_instruction); leave its brief in place, continue with the rest.
Verify when done: GET http://localhost:3003/api/projects/validate?automation=<a> returns ok:true.`;

function fullText(automation: string): string {
  return `Develop the automation "${automation}" in the Fractera projects app (light flow — no development steps).

READ FIRST (in this order)
1. GET http://localhost:3003/api/projects/fetch-complete-automation-architecture-with-history?automation=${automation}
   — the complete architecture as ONE JSON; its agent_instruction is your contract. Work the entities flagged
   pending:true (note: diagram.nodes is an object — the node list is its "instances" array).
2. AUTOMATION-PROJECTS.md at the project root.
3. The automation's own folder: app/(projects)/projects/${automation}/ (_data/, _nodes/).

${CLOSING.replaceAll("<a>", automation)}`;
}

function deltaText(automation: string, items: { entityType: string; ref: string; label: string; task: string }[]): string {
  const list = items
    .map((i, k) => {
      const where = i.ref ? `${i.entityType} ${i.ref}` : `the automation's ${i.entityType}`;
      return `${k + 1}. ${i.label} — ${where}\n${i.task.trim() || "(no brief given)"}`;
    })
    .join("\n\n");
  return `Continue on "${automation}" — ${items.length} new staged change(s). You already hold this automation's context: do NOT reload the full architecture JSON. Re-read only what the changes below touch (the object's own files/slice), then implement them, adjusting related nodes/edges where a change requires it.

${list}

${CLOSING.replaceAll("<a>", automation)}`;
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  // THE GATES SURVIVE THE STEP MACHINERY (they were never about steps) — launchGate (lib/wave.ts, step 250)
  // is the ONE set of checks every development entry point passes, with the reason codes the dialog speaks.
  const gate = await launchGate(proj.automation);
  if (!gate.ok) {
    return NextResponse.json(
      gate.nodes ? { reason: gate.reason, nodes: gate.nodes } : { reason: gate.reason },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ok: true,
    staged: gate.items.length,
    full: fullText(proj.automation),
    delta: deltaText(proj.automation, gate.items),
  });
}
