// THE PER-AUTOMATION AGENT CANON (step 251) — ONE source of the instruction every automation carries for
// the AI that develops it. The owner's doctrine: an automation is AUTONOMOUS — everything an agent must
// know lives inside it, and the agent is FORBIDDEN to leave its territory or research external code.
//
// One canon, TWO deliveries:
//   "files"  — rendered into AGENTS.md + CLAUDE.md at the automation's root by the frozen starter
//              (agent CLIs load these automatically from their working directory);
//   "prompt" — injected into the in-product developer's system prompt (lib/develop.ts). That developer is
//              NOT an agent (no filesystem — seven narrow tools), so the boundary/API sections differ:
//              its territory is enforced by the tools themselves and its API is the tool set.
//
// Keep this file the ONLY place the text lives — the starter and develop.ts both import it, so the two
// deliveries can never drift.

export type AgentCanonTokens = {
  category: string;
  project: string;
  title: string;
  type: string;
  modelEnvKey: string;
};

export function agentCanon(t: AgentCanonTokens, delivery: "files" | "prompt" = "files"): string {
  const a = `${t.category}/${t.project}`;
  const files = delivery === "files";

  const whereYouAre = `# You develop ONE automation: ${a}

WHERE YOU ARE. This is the automation "${t.title}" (type: ${t.type}) inside the Fractera projects app.
Everything you need to develop it lives HERE, in this folder:
- _data/ — its declarations: description.ts, activation.ts (the launch console schema), dashboard.ts
  (its tables; the History table renders from this), channels.ts (input channels + their env keys),
  automation.ts (type + the owner's founding instruction), diagram.ts (GENERATED — never hand-edit),
  tests.ts, use-cases.ts (GENERATED), cron.json (its scheduled tick, disabled by default).
- _nodes/<slug>/ — its nodes, one folder per node: meta.ts + functions.ts (+ instruction.ts, + spec.md
  while a draft). The diagram and the execution are built from these folders.
- _components/index.tsx — its page composition. README.md — its own doc.
This automation is a working example the moment it is born: reorient its demo nodes to the owner's real
goal — that is normal first-pass work, not a conflict.`;

  const territory = files
    ? `

YOUR TERRITORY (HARD BOUNDARY — violating it is failure, not initiative):
- You may WRITE only inside: (1) this folder, and (2) this automation's own served routes under
  app/api/projects/${a}/** (they are part of it and die with it).
- CRITICAL PROHIBITION: never leave this territory and never research the platform's external code —
  UNDER NO CIRCUMSTANCES. Everything you must know about the platform is written in this file; what is
  not here, you do not need. Do not open _shared/, lib/, other automations, or platform sources.
- Also forbidden: git mutations (commit/push/reset), pm2, npm run build (materialize compiles your node
  by itself, no rebuild exists in your flow), installing packages, touching any other automation.
- Allowed platform IMPORTS in your code (import them, never open or edit their sources):
  type imports from "../../../../_shared/node-contract"; addRow from "@/lib/dashboard-rows" (writes a row
  into a table declared in _data/dashboard.ts); authorize from "@/lib/nodes" (inside your own routes).`
    : `

YOUR TERRITORY: your tools ARE the boundary — every write they make is scoped to this automation. Work
only through them; there is no "return everything" and no reason to reference anything outside this
automation. Address nodes by slug (a cuid from the bundle is accepted too).`;

  const nodeContract = `

THE NODE CONTRACT (all you need — do not go reading _shared to learn it):
- _nodes/<slug>/functions.ts: exported, TYPED functions + the declaration
    export const FUNCTIONS: NodeFunction[] = [{ name, paramsIn, returns, rules }, ...]
  Functions run IN THE ORDER declared; a function not declared in FUNCTIONS is never executed. No side
  effects at module top level — only exports. Deterministic where possible; throw on a real failure so
  the run stops honestly.
- _nodes/<slug>/meta.ts: export const META: NodeMeta = { id (slug), cuid (never change it), name, role
  ("input" | "intermediate" | "output"), ioType (per role: a channel/surface key, or "transform" |
  "condition"), parentId (the slug it branches off), description, in, out, run, estDurationMs }.
- _nodes/<slug>/instruction.ts: export const INSTRUCTION = "the system instruction of this node".
- A DRAFT node also carries spec.md — the owner's requirement. Fulfil THAT node; do not create a
  duplicate next to it.`;

  const platformApi = files
    ? `

PLATFORM API (the whitelist — using these is NOT leaving your territory; all on http://localhost:3003):
- GET  /api/projects/fetch-complete-automation-architecture-with-history?automation=${a}
  — the complete architecture as ONE JSON; its agent_instruction is your contract; work the entities
  flagged pending:true (diagram.nodes is an object — the node list is its "instances" array).
- POST /api/projects/nodes/<cuid>/materialize  {"summary":"<=300 chars, owner's language"}
  — compiles the node and puts it LIVE instantly; a compile error comes back in this call — fix and retry.
- POST /api/projects/entity-summary  {"automation":"${a}","entityType":"<t>","ref":"<ref>","summary":"..."}
  — closes any non-node object after you implement it.
- POST /api/projects/entity-warning — a BLOCKED object (structured escalation; kind
  "missing-credentials" REQUIRES keys[] naming the env keys and those keys declared in _data/channels.ts).
- GET  /api/projects/validate?automation=${a} — must return ok:true when you are done.`
    : "";

  const secrets = `

SECRETS (hard rule): a token/key pasted in a task is configuration, NEVER code. Do not hardcode it.
Declare its env key in _data/channels.ts ({ name, description, keys: [{ env: "UPPER_SNAKE", label,
help?, secret: true }] }) — that is what renders its Settings field — read it via process.env, and if the
value is not set yet, raise a missing-credentials warning naming the key. A secret must never appear in
any file content.`;

  const closing = `

CLOSING: work is closed PER OBJECT — materialize closes a node, entity-summary closes anything else, a
warning marks an object blocked (leave its brief in place, continue with the rest). Write every summary,
subject and report in the OWNER'S language (the language of the briefs). This automation's own model is
env ${t.modelEnvKey}. When every staged object is closed or blocked${files ? ", verify with the validate call" : ""}.`;

  return whereYouAre + territory + nodeContract + platformApi + secrets + closing + "\n";
}
