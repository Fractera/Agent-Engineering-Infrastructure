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
version: 0.5.0
metadata:
  hermes:
    tags: [project, automation, orchestrate, decompose, steps, node, dag, materialize, coder-handoff, workflow, cron, tool]
    related_skills: [route-project-or-pages-request, compose-frozen-template, persist-env-var-with-rebuild, prepare-automation-knowledge, propose-new-agent-skill-or-mcp, delegate-task]
---

# orchestrate-project-by-steps

The **frozen process** for **projects** (automations / internal tools). You give a **proposed
node graph**; the engine decomposes it into a materialized queue of development sub-steps and
gates each on **spec completeness** — before any code is written.

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

- **You pass a GRAPH, not a plan of steps.** Each node is:
  `{ id, title, kind, description, task, tools[], envKeys[], io{in,out}, todo[], dependsOn[] }`.
  - `kind` ∈ `trigger` | `action` | `transform` (WDK-compatible).
  - `task` is the EXHAUSTIVE sub-step spec, not a one-liner.
  - `envKeys` are UPPER_SNAKE and get materialized later via the `persist-env-var-with-rebuild`
    skill (step 143) — never hardcode a secret.
  - `io` is a WDK-neutral seam — abstract now, filled with the real Vercel Workflow schema in D6.
  - `dependsOn` are the DAG edges (each id must resolve to another node; no cycles).
  - a node is coder-built by default; set `needsCoder: false` to skip its handoff step.
- **The engine NORMALIZES + VALIDATES + GATES — you do not hand-fix the graph.**
  1. NORMALIZE — slug ids (English, forever — rule 166), UPPER_SNAKE keys, kind defaults, dedup.
  2. VALIDATE DAG — dependsOn resolve, no cycles, a root exists (topological order).
  3. VALIDATE SPEC — **the gate**: every node needs a non-empty `task`, `description`, and ≥1 `todo`,
     `io` declared, well-formed keys; and the project readme plan carries `purpose` / `efficiency` /
     `reuse` / `result`. Incomplete → `needs_spec` lists exactly what to fill; **nothing is materialized.**
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
- **No content/code generation here.** The engine plans, validates, documents, materializes (the queue +
  the project `README.md`). A coding agent develops each node later (D3).

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
- **R6 — the schema is the ONLY truth of execution (declared now, mechanics in D6).** The project's WDK
  workflow schema (the canvas diagram) is simultaneously the presentation AND the single definition of the
  automation: an action that is not on the schema DOES NOT EXIST in the project. Never build "shadow" steps
  in code outside the diagram; a wrong schema = a broken project. (`node.io` is the seam this fills.)
- **R11 — scope.** Projects mode covers ONLY projects/automations. Site content pages are NEVER planned or
  built here — that is the content pipeline (`orchestrate-content-by-steps`), a different frozen process.

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
contract (R1/R2/R5b/R6/R7/R11), the MVP gate in the engine, the MCP tool on :3229 and the ×6 copies.
D6 fills `io` with the real WDK schema (R6 mechanics, R8 node panel, R9 result contract). -->
