import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { buildProjection } from "@/lib/projection";
import { launchGate } from "@/lib/wave";
import { agentGateSecret } from "@/lib/agent-gate";

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

function roomText(automation: string, roomPath: string, tokens: number, items: { entityType: string; ref: string; label: string; task: string }[], gateSecret: string): string {
  const list = items
    .map((i, k) => {
      const where = i.ref ? `${i.entityType} ${i.ref}` : `the automation's ${i.entityType}`;
      return `${k + 1}. ${i.label} — ${where}\n${i.task.trim() || "(no brief given)"}`;
    })
    .join("\n\n");
  return `Develop the automation "${automation}" in its STERILE ROOM (step 254 flow — you never open the admin app).

YOUR WORKSPACE: ${roomPath}  (~${tokens} tokens — the automation's complete essence; a fresh projection
was built for you just now). Its local mirror for the owner: ai-workspace/agent-rooms/${automation}/.

HOW TO WORK
1. Read the room's AGENTS.md FIRST and obey it (WIRING-RULES.md and SCALE-RULES.md before any node/edge
   change; PLATFORM.md is the whole platform contract).
2. DESIGN BEFORE CODE — your FIRST authored file is TARGET-GRAPH.md at the room root: a table of every
   node (role, ioType, in/out keys), every edge, the full input->...->output path recited for EVERY
   surface, and the fate of every EXISTING node (kept / reoriented / deleted + why). The apply gate
   refuses new nodes without it, and refuses any graph with starved nodes or dead ends (a node no one
   feeds, a result no one reads). Only after the plan — write the code that matches it.
3. Edit ONLY inside the room. The five law documents and *.compiled.mjs are immutable; deleting files
   does nothing (deletions go through the platform APIs).
4. When done (or per finished object): POST http://localhost:3003/api/projects/projection/apply
   {"automation":"${automation}"} — your diff is gated (authorship whitelist + node compilation +
   design/data-flow) and lands atomically; a refusal names exactly what to fix. Then close objects per
   PLATFORM.md (materialize / entity-summary / entity-warning) and verify:
   GET http://localhost:3003/api/projects/validate?automation=${automation} → ok:true.
5. EVERY platform HTTP call above MUST carry this header (your service pass — without it the API
   answers 403): X-Fractera-Agent-Gate: ${gateSecret}
6. REPORT ONLY FACTS. If a platform call failed, quote its exact response verbatim. NEVER attribute a
   failure to an invented cause ("system artifact buildup", "backend configuration issue") — there is
   no such machinery, and a made-up diagnosis is treated as a failed task.

${items.length
    ? `THE STAGED ITEMS (${items.length}):\n${list}`
    // The use-cases-only launch (owner 2026-07-19): confirmed use cases alone are a valid mandate.
    : `THERE ARE NO INDIVIDUALLY STAGED ITEMS. Your mandate is the automation itself: read the room's use
cases and founding instruction and build/adjust the nodes so the use cases actually run.`}`;
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  // THE GATES SURVIVE THE STEP MACHINERY (they were never about steps) — launchGate (lib/wave.ts, step 250)
  // is the ONE set of checks every development entry point passes, with the reason codes the dialog speaks.
  // ?force=1 (owner 2026-07-19): the dialog's "launch anyway" — the stub-node check becomes advisory.
  const gate = await launchGate(proj.automation, { force: req.nextUrl.searchParams.get("force") === "1" });
  if (!gate.ok) {
    return NextResponse.json(
      gate.nodes ? { reason: gate.reason, nodes: gate.nodes } : { reason: gate.reason },
      { status: 409 },
    );
  }

  // THE ROOM HAND-OFF (step 254.15, ROUTE-V3 law 4) — the PRIMARY task now: a FRESH projection is built
  // at hand-off time (deterministic — always the current truth) and the agent is pointed at the sterile
  // room, never at the admin app. full/delta stay as the legacy tail for the old copy-paste flow.
  const projection = await buildProjection(proj.automation);
  // The service pass (263.1 round 6) — embedded into the room task so the in-room agent's platform
  // calls pass authorize() in Secure mode (they carried no cookie and died with 403 before this).
  const gateSecret = await agentGateSecret();
  const room = projection.ok ? roomText(proj.automation, projection.root, projection.tokens, gate.items, gateSecret) : null;

  return NextResponse.json({
    ok: true,
    staged: gate.items.length,
    ...(room ? { room, roomPath: projection.ok ? projection.root : undefined } : {}),
    full: fullText(proj.automation),
    delta: deltaText(proj.automation, gate.items),
  });
}
