# You develop ONE automation: other/test-stream-frozen-starter

WHERE YOU ARE. This is the automation "Тест стрим Frozen стартер" (type: stream) inside the Fractera projects app.
Everything you need to develop it lives HERE, in this folder:
- _data/ — its declarations: description.ts, activation.ts (the launch console schema), dashboard.ts
  (its tables; the History table renders from this), channels.ts (input channels + their env keys),
  automation.ts (type + the owner's founding instruction), diagram.ts (GENERATED — never hand-edit),
  tests.ts, use-cases.ts (GENERATED), cron.json (its scheduled tick, disabled by default).
- _nodes/<slug>/ — its nodes, one folder per node: meta.ts + functions.ts (+ instruction.ts, + spec.md
  while a draft). The diagram and the execution are built from these folders.
- _components/index.tsx — its page composition. README.md — its own doc.
This automation is a working example the moment it is born: reorient its demo nodes to the owner's real
goal — that is normal first-pass work, not a conflict.

YOUR TERRITORY (HARD BOUNDARY — violating it is failure, not initiative):
- You may WRITE only inside THIS folder. Since ROUTE-V3 it is COMPLETE: the automation's api routes live
  in its own api/ (served at /projects/other/test-stream-frozen-starter/api/...), its types in _types/, its helpers in _lib/, its
  runtime pages in pages/ — nothing of yours exists outside this folder.
- CRITICAL PROHIBITION: never leave this territory and never research the platform's external code —
  UNDER NO CIRCUMSTANCES. Everything you must know about the platform is written in this file; what is
  not here, you do not need. Do not open _shared/, lib/, other automations, or platform sources.
- Also forbidden: git mutations (commit/push/reset), pm2, npm run build (materialize compiles your node
  by itself, no rebuild exists in your flow), installing packages, touching any other automation.
- IMPORTS (ROUTE-V3 law 1 — arrows point inward): a node imports ONLY inside the route — types from
  "../../_types/..." and the rows bridge from "../../_lib/rows" (the ONE declared platform crossing;
  writes a row into a table declared in _data/dashboard.ts). Never "@/..." and never "_shared" in
  _nodes/_data/_lib/_types — the check-route-self-sufficiency gate refuses them. Inside your own api/
  routes, authorize from "@/lib/nodes" is the allowed exception.

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
  duplicate next to it.
- BEFORE adding any node or edge: read WIRING-RULES.md (in this folder) and
  answer its checklist IN WRITING — roles, edge-count laws, and the full input→…→output path trace are
  mandatory; a node whose output nobody consumes must not be mounted.
- BEFORE any change at all: read SCALE-RULES.md (in this folder) — scale
  assessment is your FIRST decision; a task over the node budget (or inherently several automations)
  means ZERO changes and a decomposition recommendation instead, and that outcome is a SUCCESS.

PLATFORM API (the whitelist — using these is NOT leaving your territory; all on http://localhost:3003):
- GET  /api/projects/fetch-complete-automation-architecture-with-history?automation=other/test-stream-frozen-starter
  — the complete architecture as ONE JSON; its agent_instruction is your contract; work the entities
  flagged pending:true (diagram.nodes is an object — the node list is its "instances" array).
- POST /api/projects/nodes/<cuid>/materialize  {"summary":"<=300 chars, owner's language"}
  — compiles the node and puts it LIVE instantly; a compile error comes back in this call — fix and retry.
  It emits _nodes/<slug>/functions.compiled.mjs — the node's RUNTIME artifact. NEVER delete or edit it.
- POST /api/projects/entity-summary  {"automation":"other/test-stream-frozen-starter","entityType":"<t>","ref":"<ref>","summary":"..."}
  — closes any non-node object after you implement it.
- POST /api/projects/entity-warning — a BLOCKED object (structured escalation; kind
  "missing-credentials" REQUIRES keys[] naming the env keys and those keys declared in _data/channels.ts).
- GET  /api/projects/validate?automation=other/test-stream-frozen-starter — must return ok:true when you are done.

INPUT EVENTS ARE PUSHED — NEVER POLL FOR YOUR OWN INPUT (hard architecture law):
- Every incoming event (a Telegram message, any input-channel signal) reaches this automation as a PUSH
  into its run door (api/run): the platform's listener receives it and calls the door instantly, as a
  JSON-string envelope in "input" (telegram: { source:"telegram", chatId, messageId, text, date,
  photoFileId?, location? }). Your input node's job is to CONSUME that envelope — parse it in the node's
  first function and normalise into the midstream contract.
- To connect a Telegram bot: declare the token's env key in _data/channels.ts (its Settings field), and
  register the bot with POST /api/project-config/register-bot {"category","project","token"} — the
  platform starts pushing that bot's messages into api/run with no restart.
- FORBIDDEN: calling getUpdates anywhere, scheduling an input-polling job in cron.json, or any other
  self-made polling for input. Two getUpdates consumers on one token eat each other's messages — your
  poll BREAKS the platform listener. cron.json exists ONLY for scheduled OUTPUT work (reports, digests)
  and pulls of external DATA APIs — never for input channels.

BASH OUTPUT LOST — THE REBUILT-ROOM ANTIPATTERN (a known platform trap; recognising it is your job):
- This workspace is a disposable projection: the platform may WIPE AND REBUILD it between development
  sessions. Symptom: a Bash call fails with "<bash output unavailable: ... tasks/....output could not be
  read (ENOENT) ... another Claude Code process ... deleted it during startup cleanup>", or paths grow an
  "undefined" segment.
- That message's guess is usually WRONG here — the folder was rebuilt under you. It is NOT a signal to
  retry in a loop, to rm anything, or to recreate the missing directories.
- Cope like this: (1) re-list the workspace root and re-read the task files — work from the files as they
  are NOW; (2) use ABSOLUTE paths in every command (relative writes after a rebuild land in an orphaned
  folder nobody can see); (3) if it repeats, say so in your report and keep working through the file tools
  (Read/Write/Edit) — they are unaffected; (4) never create or use a directory literally named
  "undefined" — its appearance is a symptom to report, not a path to build on. One agent session per
  automation: if you learn another session is working here, stop and say so.

SECRETS (hard rule): a token/key pasted in a task is configuration, NEVER code. Do not hardcode it.
Declare its env key in _data/channels.ts ({ name, description, keys: [{ env: "UPPER_SNAKE", label,
help?, secret: true }] }) — that is what renders its Settings field — read it via process.env, and if the
value is not set yet, raise a missing-credentials warning naming the key. A secret must never appear in
any file content.

CLOSING: work is closed PER OBJECT — materialize closes a node, entity-summary closes anything else, a
warning marks an object blocked (leave its brief in place, continue with the rest). Write every summary,
subject and report in the OWNER'S language (the language of the briefs). This automation's own model is
env TEST_STREAM_FROZEN_STARTER_MODEL. When every staged object is closed or blocked, verify with the validate call.
