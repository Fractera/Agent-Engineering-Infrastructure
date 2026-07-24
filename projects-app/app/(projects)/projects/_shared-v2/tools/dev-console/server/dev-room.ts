import { stat } from "node:fs/promises";
import { join } from "node:path";
import { resolveProject } from "@/lib/nodes";
import { agentGateSecret } from "@/lib/agent-gate";

// СЕРВЕРНАЯ ФУНКЦИЯ микросервиса «дев-консоль» — lean-хендофф v2: даёт консоли рабочую папку (`roomPath`) и
// мандат агенту (`roomTask`). Живёт РЯДОМ со своим клиентом (микросервис), а не в `api/`. Дверь
// `api/projects/dev-room` — тонкая обёртка над этой функцией.
//
// Почему НЕ v1 `handoff`: v1 строит проекцию в `agent-rooms/` и приземляет через gated-apply — машинерия
// узлов v1. Автоматизация v2 самодостаточна (закон устойчивости): её папка И ЕСТЬ комната, а «шлюз записи»
// — её собственные двери (`api/patch` + `npm run check:core`).

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

export type DevRoom =
  | { ok: true; roomPath: string; roomTask: string }
  | { ok: false; status: number; error: string };

/** Собрать рабочую папку + мандат для дев-консоли. v2-автоматизация = папка с типизированным ядром. */
export async function getDevRoom(automation: string): Promise<DevRoom> {
  const proj = resolveProject((automation ?? "").trim());
  if (!proj.ok) return { ok: false, status: 400, error: proj.error };
  const coreFile = join(proj.projectDir, "_data", "automation.json");
  try {
    await stat(coreFile);
  } catch {
    return { ok: false, status: 404, error: "not a v2 automation (no _data/automation.json)" };
  }
  const gateSecret = await agentGateSecret();
  return { ok: true, roomPath: proj.projectDir, roomTask: roomTask(proj.automation, proj.projectDir, gateSecret) };
}
