---
name: orchestrate-project-by-steps
description: >
  Turn a PROJECT (automation / internal tool) request into a fully decomposed, materialized
  queue of development sub-steps the RIGHT way — the frozen process for projects, the sibling
  of orchestrate-content-by-steps. Use when the owner wants a private automation ("summarize
  my YouTube channels to Telegram every morning", "auto-publish on a schedule", "a tool for my
  own use"), NOT a public content group. You (Hermes / a model) PROPOSE a graph of nodes
  (task / tools / keys / io / dependsOn); this engine NORMALIZES it, VALIDATES the DAG, GATES
  on spec completeness, and MATERIALIZES the whole queue to disk — one rich spec step per node
  plus one coder-handoff step per node — BEFORE any development. It does NOT deploy, does NOT
  execute a node, does NOT write code: a coding agent builds each node LATER from its step
  file. The gate is SPEC COMPLETENESS, not a deployment record.
version: 0.8.0
metadata:
  hermes:
    tags: [project, automation, orchestrate, decompose, steps, node, dag, materialize, coder-handoff, workflow, cron, tool]
    related_skills: [route-project-or-pages-request, compose-frozen-template, persist-env-var-with-rebuild, prepare-automation-knowledge, propose-new-agent-skill-or-mcp, delegate-task]
---

# orchestrate-project-by-steps

The **frozen process** for **projects** (automations / internal tools). You give a **proposed
node graph**; the engine decomposes it into a materialized queue of development sub-steps and
gates each on **spec completeness** — before any code is written.

> **READ FIRST — the automation-ontology glossary**
> (`CRUD-DOCS/workspace-standards/automation-ontology.md`, step 188-R): every automation is
> composed of EXACTLY twelve entities — Automation · Trigger · Hook · Condition · **Action** ·
> Router · Step | Integration · Channel · State | Run · Record. The graph you propose is a typed
> instance of that ontology and the engine VALIDATES it (schema v2, engine ≥0.8). An automation
> described outside the ontology is a defect. Note the terminology: **Action is the first-class
> entity** (a named outcome = a branch of steps, bound to its hook phrases); a work NODE is a
> `step` (the old node kind `"action"` is accepted only as a legacy alias of `step`).

This skill is **self-sufficient**: one `.mjs` (or, from D5, one MCP tool), no Hermes required —
a lone agent (even a project with only Codex) runs the whole process on its own.

## Why this exists (read once)

Content had a frozen process (`orchestrate-content-by-steps`); projects did not. Without deep,
materialize-first decomposition a project is "doomed to fail" (owner). From the content engine we
take **only the idea** — freeze the process: decompose and write the whole sub-step queue to disk
FIRST, only then develop. The mechanism is a different machine: content decomposes deterministically
by file STATE and deploys each sub-step in one process; a **project is decomposed by a model** (you
propose the graph), and the engine only **PLANS / VALIDATES / DOCUMENTS / MATERIALIZES** — the real
development of each node happens LATER, done by a coding agent in its own session.

## Which scenario is this? (decide FIRST)

Route with `route-project-or-pages-request` if unsure. This skill is for a **PROJECT** — a private
automation or internal tool the owner runs for themselves (a scheduled pipeline, a bot, a data job),
**not** a public page group (that is `orchestrate-content-by-steps` / `compose-frozen-template`). If
the owner wants "a news page / a blog / documentation", that is content — stop and use the content path.

## The mental model

- **You pass a GRAPH, not a plan of steps** (schema v2 — the ontology as data):
  `{ category?, slug?, project{purpose,efficiency,reuse,result},
     interface{ inputs:[Port], outputs:[Port] },
     actions?: [{ id, title, description, color?, hooks:[{phrase,lang}], condition?, channel }],
     state?: [{ id, storage, purpose }], nodes[] }`, each node
  `{ id, title, kind, actions: string[]|"all", condition?, errorPolicy?, state?: string[],
     description, task, tools[], envKeys[], io{in,out}, todo[], dependsOn[] }`.
  - **`actions[]` (registry)** — the automation's named outcomes: id/title/description, a `color`
    (auto-assigned from a palette when omitted), its `hooks` (spoken phrases), an optional declared
    `condition` guard, and the delivery `channel`. Configuring an automation = configuring Actions.
  - **`node.actions`** — WHICH action branches flow through the node: an explicit id list for
    branch nodes, `"all"` for trunk nodes (trigger/router default to `"all"`). Every action needs
    ≥1 node naming it explicitly — trunk coverage alone is not a branch.
  - `kind` ∈ `trigger` | `router` | `step` | `transform` (`action` = legacy alias of `step`).
    A `router` (the classifier turning an event into an action id) is REQUIRED whenever any
    action declares hooks.
  - `condition` — a DECLARED guard ("run only if …"): the schema documents it, the diagram and
    the records table show it, and the coder implements it in the step body (R6). Declarative
    only — no executable DSL.
  - `errorPolicy` ∈ `retry-next-tick` | `soft-degrade` | `fail-run` (optional per node).
  - `state[]` (registry) + `node.state` — declared persistent data between runs (cursors, vector
    memory) so no model reinvents storage.
  - **`interface { inputs:[Port], outputs:[Port] }` (§E, entity 14) — REQUIRED.** The automation's typed
    I/O boundary: what triggers it / flows IN, and where results land OUT. A `Port` is
    `{ type, source|destination, surface?, cardinality?, external?, autonomous?, format? }`; `type` ∈ the
    CLOSED set `channel | page | store | schedule | event | manual | external-api` (inputs & outputs share
    it). **Outputs are a LIST** — declare EVERY destination (a news automation may output a `page` AND an
    `external-api` publish at once). Mark `autonomous: true` for an output that outlives the run (a generated
    course/quiz page). **MATCH the request to ports BEFORE decomposing** (the use-case catalog in
    `automation-ontology.md` §E): timer→publish = `schedule` in + `page` out; voice→reminder = `channel`
    in/out; a `page` output is realized through the automation⇄page gateway (`automation-page-gateway.md`),
    never by writing page files in a step. This is what stops a model silently copying a prior shape
    (the real 189 seed degenerated to Telegram→Telegram for lack of a declared boundary).
  - `task` is the EXHAUSTIVE sub-step spec, not a one-liner.
  - `envKeys` are UPPER_SNAKE and get materialized later via the `persist-env-var-with-rebuild`
    skill (step 143) — never hardcode a secret.
  - `io` is a WDK-neutral seam — abstract now, filled with the real Vercel Workflow schema in D6.
  - `dependsOn` are the DAG edges (each id must resolve to another node; no cycles).
  - a node is coder-built by default; set `needsCoder: false` to skip its handoff step.
  - Back-compat: a v1 graph (no `actions[]`/`state[]`) normalizes to `actions:"all"` on every
    node; it STILL must declare an `interface` (gate 12 applies to every graph).
- **The engine NORMALIZES + VALIDATES + GATES — you do not hand-fix the graph.**
  1. NORMALIZE — slug ids (English, forever — rule 166), UPPER_SNAKE keys, kind defaults, dedup.
  2. VALIDATE DAG — dependsOn resolve, no cycles, a root exists (topological order).
  3. VALIDATE SPEC — **the gate**: every node needs a non-empty `task`, `description`, and ≥1 `todo`,
     `io` declared, well-formed keys; the project readme plan carries `purpose` / `efficiency` /
     `reuse` / `result`; and the graph declares a valid **`interface`** (≥1 typed input & output from the
     closed port vocabulary — gate 12; a declared output with no producing node is warned — gate 13).
     Incomplete → `needs_spec` lists exactly what to fill; **nothing is materialized.**
- **🔒 The gate is SPEC COMPLETENESS, not a deployment record.** Unlike content, this engine deploys
  nothing and executes no node. "Done" for a node = a coder closed it, not "a deploy row".
- **MATERIALIZE-FIRST (step 172).** On approval the engine writes the WHOLE queue BEFORE any development:
  first the **project-root `README.md`** generated from the graph (§4.1 — why / how it works as an
  auto-table of the nodes / efficiency / reuse / result + a `fractera:project` machine block; at the
  frozen `project-page` mount `app/(projects)/projects/<cat>/<slug>/README.md`, developing the step-178
  template), then into `DEVELOPMENT-STEPS/NEW-STEPS/`: one rich **spec step** per node
  (`<NN>-<slug>.md`, §4.2 — its first instruction is "read the project README") plus one
  **coder-handoff step** per coder-built node (`<NN>-coder-handoff-<slug>.md`, §4.3).
- **"Calling the coder is its own step" (owner rule).** The handoff is a SEPARATE materialized step, and
  it is EXHAUSTIVE — the orchestrator hands a coding agent ONLY its step number. The file carries the fixed
  first actions (read the project README → open spec step NN → obey your own workspace instructions), the
  deliverable, the node-at-a-glance (kind / tools / env keys / depends / io), an offline-documentation
  reminder (external docs are on disk under `CRUD-DOCS/external/`, no internet), the acceptance criteria,
  and the finish protocol (deploy → record → close both steps). This mirrors the SOUL delegation edge and
  the `delegate-task` / `prepare-automation-knowledge` skills: real code is always DELEGATED, never written
  by the orchestrator, and delegation is a numbered step, not an ad-hoc chat prompt.
- **The EXECUTION SCHEMA is generated from the graph (D6, contract R6; ontology 188-R).** On an
  approved run the engine emits every derived side of the R6 invariant from the SAME graph:
  - `app/(projects)/projects/<cat>/<slug>/_data/flow.ts` — the canvas diagram as data (react-flow
    nodes/edges, layered by DAG depth) with the full R8 info payload per node (summary / processes /
    kind / **actions** / **condition** / task / tools / envKeys / io). DERIVED like the README:
    **always rewritten** deterministically (marker `// fractera:flow <sheetId>`) — never hand-edit
    it; extend the graph and re-run.
  - `app/(projects)/projects/<cat>/<slug>/_data/actions.ts` — the **Actions registry as data**
    (marker `// fractera:actions <sheetId>`, always rewritten): id/title/description/color/hooks/
    condition/channel per action. The hooks panel derives its suggestions from it, the records
    table and the diagram read titles/colors from it — no surface hardcodes an action.
  - `app/api/projects/<cat>/<slug>/_workflow/definition.ts` — the durable WDK workflow skeleton: one
    `"use step"` function per NON-trigger node in topological order, each under a `// node:<id>` marker;
    `runProject` chains them through an `artifacts` accumulator; trigger nodes are not steps (they ARE
    the run route / cron queue). Written ONLY when the file is absent or still the composed starter
    placeholder (`fractera:starter-workflow`) — **never over a coder's implemented steps**. A kept file
    is VALIDATED for isomorphism with the diagram (`workflow.iso` in the output: every non-trigger node
    has its marker, no extra markers) — a mismatch is a warning the coder must reconcile, not a blocker.
  A coder implements ONLY the step bodies; a new action = extend the GRAPH and re-run the engine — a
  shadow step outside the diagram is forbidden (what is not on the diagram does not exist).
- **No content/code generation here.** The engine plans, validates, documents, materializes (the queue +
  the project `README.md` + the execution schema). A coding agent develops each node later (D3).

## Operating contract of the projects mode (owner, 2026-07-05 — R1–R11)

These rules are the PERSONALITY of the projects mode — they bind whoever orchestrates (Hermes or a lone
agent), on top of the engine mechanics:

- **R1 — default language first.** On the very FIRST session with the architect, BEFORE any project work,
  establish the default working language: ask which language is comfortable → warn it becomes the default →
  set it via the `persist-env-var-with-rebuild` skill (build-time env, step 143; the app rebuilds). Do NOT
  confuse with merely READING the language set (step 150) — this is the one-time SET. The first-session
  gate itself is a dedicated platform task; your duty here is: if no default language was ever established,
  do it first.
- **R2 — full authority.** In projects mode you are AUTHORIZED to use ALL skills, MCP tools and agents
  available to you to realize the project. Do not ask permission to pick a tool — choosing instruments is
  your job; confirmation protocols exist only where a skill itself demands one (order sheet, mutations).
- **R5b — delegate → watch → proceed.** After handing a coder its handoff-step number, the node is NOT done.
  Track completion: the step file moved to `DEVELOPMENT-STEPS/COMPLETED-STEPS/` AND a deployment record
  exists. Only then open dependent nodes (order = the DAG). No active coder is NOT a failure — the queue is
  materialized on disk; work continues when an agent appears.
- **R7 — MVP over 10 nodes.** When the validated graph exceeds 10 nodes the engine adds `mvp_recommendation`
  to the order sheet — relay it to the owner VERBATIM before confirmation. It is a recommendation (soft
  gate): MVP of ≤10 nodes, each node's extensions as separate future tasks; the owner decides.
- **R6 — the schema is the ONLY truth of execution (mechanics live in the engine since D6).** The project's
  WDK workflow schema (the canvas diagram) is simultaneously the presentation AND the single definition of
  the automation: an action that is not on the schema DOES NOT EXIST in the project. Never build "shadow"
  steps in code outside the diagram; a wrong schema = a broken project. Mechanically: the engine generates
  BOTH the diagram (`_data/flow.ts`) and the workflow skeleton (`_workflow/definition.ts`) from the approved
  graph and validates a kept workflow for isomorphism (see "The EXECUTION SCHEMA is generated from the graph").
- **R11 — scope.** Projects mode covers ONLY projects/automations. Site content pages are NEVER planned or
  built here — that is the content pipeline (`orchestrate-content-by-steps`), a different frozen process.
- **R10 — the coder→orchestrator feedback channel.** A coding agent that finds the orchestrator's
  handed-over instructions SYSTEMATICALLY incomplete for a task type — and has a skill of its OWN covering
  that gap — may materialize ONE service step per systematic gap:
  `DEVELOPMENT-STEPS/NEW-STEPS/<NN>-agent-feedback-<agent>-<topic>.md` (NN = next free number across
  NEW-STEPS + COMPLETED-STEPS), an ordinary step file whose `fractera:step` machine block carries
  `plan: { kind: "agent-feedback", from, to: "orchestrator", taskType, skill }`. The body keeps the owner's
  skeleton verbatim: "Service message from coding agent `<you>` to the orchestrator: while working on tasks
  of type `<X>`, the instructions you hand over describe `<what>` insufficiently. Among my own skills I
  found: `<skill — what it does>`. The orchestrator is advised to study this skill and, if it does not
  conflict with the orchestra's other skills, use it for further interaction with my entity." The
  orchestrator reads the step, studies the skill, adopts it if conflict-free (or declines with the reason)
  and CLOSES the step with a short report. Feedback never blocks, replaces or reopens the delegated work.

## Decision flow (do exactly this)

1. **Propose the graph** from the owner's intent (+ the cron/integration questionnaire on :3229). Each
   node fully specced (task / tools / keys / io / dependsOn / todo) and the project block filled
   (purpose / efficiency / reuse / result).
2. **Confirm (order-sheet protocol, §8.2):** run with `--dry-run` (or MCP `dry_run: true`). It returns
   an `order_sheet` — RESOLVED human lines, one per node, plus the readme plan, plus `announce_text`
   and `confirm_instruction`. **Show the owner every order-sheet line VERBATIM** — never reword them.
   Edits → change the graph → re-run `--dry-run` (the `order_sheet.id` changes).
3. **On an explicit yes** — run again WITHOUT `--dry-run`, passing `--approve <order_sheet.id>` from
   THAT dry-run. A run without the matching token is refused: a changed or unconfirmed plan cannot start.
   As you start, **relay `announce_text` to the owner verbatim** (it says the run takes a while and where
   to watch live progress: `/service/development-steps`, `/service/architecture`).
4. **Handle the result:**
   - **needs_spec** → the graph is incomplete; fill the listed `missing` items and re-run dry-run.
   - **dag gate** → fix `dependsOn` / cycles and re-run.
   - **ok** → report the materialized queue (spec steps + coder-handoff steps). A coding agent develops
     each node later; you hand it only the step number.

## Materialize-first + cold resume (step 172)

The `order_sheet.id` (`os-<sha256(normalized graph)>`) is STABLE across sessions. The whole queue lands
on disk before any work, so a process death loses nothing. **To resume — even in a brand-new session —
run again with the SAME graph and the SAME `--approve` token**: files already on disk are skipped, only
missing sub-steps are (re)written. The resume key is composite `<kind>:<seq>`, so a node's spec step and
its handoff step never collide. Never treat leftover NEW-STEPS files of a died run as garbage — they ARE
the queue.

## How to call

- **Standalone (lone agent, no MCP)** — run the engine directly:
  ```bash
  node .agents/skills/orchestrate-project-by-steps/orchestrate-project-by-steps.mjs \
    --out <slot-root> ( --plan '<graph JSON>' | --plan-file <path.json> ) \
    [--category <cat>] [--slug <proj>] [--owner-lang ru|en] [--dry-run] [--approve os-<token>]
  ```
  `--plan-file` avoids shell-quoting a big graph. The graph is a bare array of nodes OR
  `{ category?, slug?, project{purpose,efficiency,reuse,result}, nodes[] }`.
- **MCP:** `owner_projects_orchestrate_decomposition({ plan, category?, slug?, owner_lang?, dry_run?,
  approve? })` on the Projects Router MCP (:3229) — the same engine and contract: `dry_run: true` first,
  show the order sheet verbatim, then the same call with `approve` (confirm-before-mutation,
  MCP-REGISTRY §8.1/8.2).

## What it reuses (does not reinvent)

- The development-step file lifecycle, materialize-first + cold resume, the order-sheet / approve token,
  and the `fractera:step` machine block — the **waterway** shared with the content engine (~30%). The
  node contract, `normalizeGraph` / `validateDag` / `validateSpec` gate, the rich per-node spec render,
  the coder-handoff step, and the project readme plan are **written fresh for projects** (~70%). No
  deploy, no `deployment_records`, no per-node execution — those content mechanisms are deliberately out.

## When NOT to use

- A **public content group** (news / blog / docs / catalogue) → `orchestrate-content-by-steps`.
- Writing a node's actual code → that is the coding agent opening the materialized spec step (D3), not
  this engine. This engine stands up the decomposed, validated, materialized queue; it does not develop.

Self-sufficient project skill: shipped to every agent — canon `.agents/skills` (read natively by Codex /
Gemini / Kimi) + byte-identical copies in `.claude/skills`, `.qwen/skills` and Hermes `hermes-skills`
(×6 entities). It does not depend on Hermes — any single agent can run the frozen project process on its own.

<!-- D1.1–D1.3 built the engine; D2 the project README; D3 the exhaustive coder-handoff + SOUL delegation
edge; D4 wired the README into every frozen template + all 6 agent instructions; D5 added the owner
contract (R1/R2/R5b/R6/R7/R11), the MVP gate in the engine, the MCP tool on :3229 and the ×6 copies;
D5.5 the coder→orchestrator agent-feedback channel (R10: step convention + 6 coder instructions + SOUL edge);
D6 the generated execution schema (R6 mechanics: flow.ts always derived + definition.ts skeleton with
// node:<id> markers + isomorphism validation; R8 node info payload; R9 page contract in the template).
188-R (v0.8.0) the automation ontology: schema v2 (actions[]/state[] registries, node.actions/condition/
errorPolicy, kinds trigger|router|step|transform with action→step alias), the ontology gates (dedicated
node per action, router when hooks, unknown ids refused), the actions.ts registry emission, README
Actions/State sections, order-sheet action lines, and the automation-ontology.md glossary as the canon. -->
