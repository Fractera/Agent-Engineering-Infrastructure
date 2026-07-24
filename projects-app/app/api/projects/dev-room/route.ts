import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { agentGateSecret } from "@/lib/agent-gate";
import { stat } from "node:fs/promises";
import { join } from "node:path";

// THE v2 DEV ROOM (step 298) — the lean hand-off for the SECOND-VERSION automations (the typed-core
// frozen template). It gives the dev console exactly two things: the working folder (roomPath) and the
// agent's mandate (roomTask). Nothing else.
//
// WHY IT IS NOT /api/projects/handoff. The v1 hand-off builds a PROJECTION into agent-rooms/ and lands the
// agent's diff through a gated apply — machinery bound to v1's node/_nodes architecture. A v2 automation is
// SELF-CONTAINED (law 0): its folder already holds its whole essence (core, code, instructions), so the
// folder IS the room. The "gated apply" for v2 is its own doors — `api/patch` (Zod-validates the whole core
// before writing) and `npm run check:core` — not a separate projection. The full read/write-door refactor
// is phase 2 of this step; here we only open the live console.
export const runtime = "nodejs";

// The agent's task text. English on purpose (the model reads it; the conductor wraps it in an English
// marker prompt). It points the agent at the automation's OWN founding documents and its OWN doors.
function roomTask(automation: string, roomPath: string, gateSecret: string): string {
  return `Develop the automation "${automation}" (a version-2, typed-core automation) directly in its OWN folder.

YOUR WORKSPACE: ${roomPath}
This folder is SELF-CONTAINED (law 0): the automation's whole essence — its core, its code, its instructions —
lives here. Edit ONLY inside this folder; never reach outside it.

READ FIRST (in this order):
1. AGENTS.md — the entry point for this automation.
2. CLAUDE.md, then _instructions/passport.md.
3. ARCHITECTURE.md (how it is built) and _data/automation.schema.ts (the exact shape of the core).

HOW TO CHANGE THE CORE (the single source of truth is _data/automation.json — NEVER hand-edit it blindly):
- Preferred: POST http://localhost:3003/projects/${automation}/api/patch  {"address":{...},"set":{...}}
  — it validates the WHOLE core with Zod before writing and refuses in words if anything is off.
- Or: edit _data/automation.json in the folder, then IMMEDIATELY run, from /opt/fractera/projects-app:
  npm run check:core  — a GREEN check:core is the mandatory gate. It proves the core is LAWFUL, not that the
  automation works.
- PROOF is a real run: POST http://localhost:3003/projects/${automation}/api/run and confirm the result.
- Node functions live in _lib/nodes/<function-name>.ts; component work in _components/ + _lib/components/.

EVERY http call to :3003 above MUST carry this header (your service pass — without it the API answers 403):
X-Fractera-Agent-Gate: ${gateSecret}

REPORT ONLY FACTS. If a call failed, quote its exact response. Never invent a cause for a failure.`;
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  // A v2 automation is one whose folder carries the typed core `_data/automation.json`. If it is not there,
  // this is not a v2 automation and this door has nothing to hand over.
  const coreFile = join(proj.projectDir, "_data", "automation.json");
  try {
    await stat(coreFile);
  } catch {
    return NextResponse.json({ error: "not a v2 automation (no _data/automation.json)" }, { status: 404 });
  }

  const gateSecret = await agentGateSecret();
  return NextResponse.json({
    ok: true,
    roomPath: proj.projectDir,
    roomTask: roomTask(proj.automation, proj.projectDir, gateSecret),
  });
}
