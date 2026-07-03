---
name: orchestrate-content-by-steps
description: >
  Do a content request the RIGHT way, end-to-end, through the frozen development-step
  process. Use whenever the owner asks for content work — "make me a page about Apple",
  "add a news section", "add 3 test news", "create a blog". You pass only the INTENT
  (an action + a topic); this orchestrator DECOMPOSES it by the site's state (does the
  section exist?) into dependent sub-steps, and runs EACH through the full lifecycle:
  open a development step → do it → deploy → RECORD the deployment → close the step. The
  deployment record is a GATE — a step never closes without it (the Vercel invariant). You
  do NOT chain tools yourself, do NOT decompose by hand, do NOT generate content or code.
  Prefer this over calling compose / create-page directly for any real owner request.
version: 1.0.0
metadata:
  hermes:
    tags: [content, orchestrate, news, blog, documentation, page, section, add, create, steps, deployment, lifecycle, decompose, apple]
    related_skills: [compose-frozen-template, manage-content-collections, record-deployment, confirm-before-mutation]
---

# orchestrate-content-by-steps

The **frozen process** for content operations. You give an **intent**; the orchestrator does
the rest **deterministically** — it decomposes the work by the site's state and runs every
piece through the real development-step lifecycle, with the deployment record as a hard gate.

This skill is **self-sufficient**: it is one tool (or one `.mjs`), no Hermes required.

## Why this exists (read once)

Calling `compose` / `create-page` directly, by hand, is what caused the failure: an agent did
"create section + 3 pages + rebuild" in one chaotic burst and crashed. The fix is to **freeze
the process**, not just the templates. You stop orchestrating; the pipeline does.

## Which scenario is this? (decide FIRST)

This skill runs the **FROZEN-ASSEMBLY** scenario only: a FLAT, MCP-only pipeline that stands up **new**
structural stubs from frozen templates. It is NOT the coding pipeline. Confirm the vector before using it:
- **CREATE-new** stubs (a section that does not exist yet, a new page/stub in a group) → FROZEN — use this.
- **MODIFY an existing page** or **author real/custom content** (fill a stub with real prose) → that is
  **REAL-DEVELOPMENT** (coding agents), NOT this skill. Refuse and route it out (a coding agent, or from
  Hermes `owner_report_blocker_step`); the stub executors already refuse a real body.

The border is the OPERATION, not a time-phase: create-new stub = FROZEN; modify-existing / real content =
REAL-DEV. If the owner's vector is not explicit, ask ONE question first ("a quick prototype from frozen
templates, or turning them into a real project / changing something existing?"). Full rule:
`CRUD-DOCS/workspace-standards/task-scenario-router.md`.

## The mental model

- **You pass an INTENT, not a plan:**
  - `action: 'add-page'` + `topic` → one page about a topic (e.g. `topic: apple`).
  - `action: 'create-section'` (+ `samples: N`) → a new section / N test posts.
  - optional `tab` (default `news`), `format`, `languages`.
- **`topic` is ONE language-agnostic concept, named in English.** One `add-page` produces ONE post
  spanning ALL the slot's languages (the stub carries every language cell). NEVER issue one add-page
  per language, and NEVER pass a translated title as a topic — a Spanish title would slugify into a
  second post. Translating an existing post is a SEPARATE path (`owner_content_translate_pending`),
  not another add-page.
- **The orchestrator DECOMPOSES by STATE — you do not.** Asked for a page about Apple and the
  news section does not exist? It runs **two** sub-steps: (A) create the section, (B) add the
  page. Section already exists? Just (B). This is deterministic — it checks the slot, it does
  not guess.
- **Every sub-step runs the FROZEN cycle (order fixed):**
  `open development step → execute (compose | clone stub) → deploy → verify → RECORD in the
  Deployment table → close step`.
- **🔒 The deployment record is a GATE.** A step **cannot be closed** without a confirmed row
  in `deployment_records` (like Vercel never skips recording a deploy). If recording fails, the
  step **stays open** and the run stops — you report it, you do NOT hand-fix.
- **No content/code generation.** Sections come from the Frozen Template Constructor; pages are
  clones of frozen stubs. "3 test news" = `create-section samples=3` (the stubs ARE the test news).

## Decision flow (do exactly this)

1. **Extract the intent** from the request: action (`add-page` for "a page about X"; `create-section`
   for "a section" / "N test posts"), topic, tab.
2. **Confirm (§8.2):** call `owner_content_orchestrate` with `dry_run: true` → it returns the
   **decomposition** (the sub-steps it will run). Show the owner, get a yes.
3. **Run:** call again without `dry_run`. It executes every sub-step through the frozen cycle and
   returns the **chronology**: steps opened/closed, deployment record ids, public URLs.
4. **Handle the result:**
   - **ok** → report the chronology + the public URLs (mode-aware) to the owner.
   - **a sub-step failed** → it tells you the failing stage and that the step was **kept open**
     (no record → not closed). Report it plainly. If it ERRORED (broken tool), the fix is to
     repair the tool — do **not** hand-author or delegate hand-authoring as a workaround.

## How to call

- **MCP (every agent):** `owner_content_orchestrate({ action, topic?, tab?, format?, samples?, languages?, dry_run })`.
  Always `dry_run: true` first.
- **Compound (multi-group) request → one `plan` + the ORDER SHEET protocol (step 167).**
  `owner_content_orchestrate({ plan: [{ tab, format?, samples?, menus?, roles?, languages?, pages?,
  admin, dashboard }, …], owner_lang, dry_run })` — the orchestrator flattens it into fine sub-steps
  (create-section → add-page(s) → remove-seed → set-group → set-auth) and runs them in order, gated.
  The confirmation is MECHANICAL — follow this exact protocol:
  1. **`admin` and `dashboard` are MANDATORY per group.** Missing → the tool returns `needs_input`
     with the exact question texts: ask the owner VERBATIM (use `explain` verbatim if they ask what
     it means), set the booleans, dry_run again. Never guess these answers.
  2. **dry_run returns an `order_sheet`** — RESOLVED human lines, one per group ("news — Visible to:
     EVERYONE (no login) — Appears in: top menu, footer — …") plus `implied` lines (e.g. auto-enabling
     the site login) plus **`content_boundary`** — the mandatory disclaimer that pages come up as frozen
     placeholder stubs (names become URL identifiers only; titles/body are placeholders; real naming and
     content are a SEPARATE later request). **Show every line AND the content_boundary to the owner
     VERBATIM** — never reword them, and NEVER promise the owner's real titles will appear (they will
     not — that promise was the E2E-2 bug). Edits → change `plan[]` → dry_run again (the id changes).
  3. **On an explicit yes** — call again (no dry_run) with `approve: "<order_sheet.id>"` from THAT
     dry_run. A run without the matching token is refused — a changed or unconfirmed plan cannot start.
  4. **As you start — relay `announce_text` verbatim** (it tells the owner the run takes a while and
     where to watch live progress).
  5. **MATERIALIZE-FIRST + RESUME (step 172).** On approve the orchestrator FIRST writes the WHOLE
     queue as `NEW-STEPS/` files — every sub-step, each carrying its full machine spec (order-sheet
     id, seq, kind, args, page URL, the approved order line) — and only then executes them in order
     (`in-progress → execute → deploy → RECORD gate → close`, `completedAt` = full ISO timestamp).
     The plan history lives ON DISK before any work: if the process dies mid-queue (timeout, crash,
     lost session), NOTHING is lost. **To resume — even in a brand-new session — call the tool again
     with the SAME `plan` and the SAME `approve` token**: completed sub-steps are skipped
     automatically, pending ones re-execute from their step files. Never re-create the sections by
     hand and never treat leftover NEW-STEPS files of a died run as garbage — they ARE the queue.
  `roles`: `"public"`/`"all"`/`"everyone"` all mean visible to everyone (no gate); `"user"` (or a csv)
  gates to signed-in holders; `"guest"` = public+guest. `menus`: `{ top|footer|left|right: { enabled,
  order } }`. An existing page in `pages` is refused (modify = coding scenario).
- **Standalone (lone agent, no MCP)** — run the orchestrator directly (needs DEPLOY_SECRET +
  DATA_SECRET in env, the sanctioned platform exception):
  ```bash
  node .agents/skills/orchestrate-content-by-steps/orchestrate-content-by-steps.mjs \
    --out . --action add-page --topic apple --tab news --store <frozen-templates-dir> --dry-run
  ```

## Announce the long run (before running, after approval)

A compound `plan` runs many sub-steps, each with a deploy — it takes a while and the chat goes quiet. Once the
owner approves the plan, tell them plainly (their language): you are going into development, it finishes by
deploying and may take a while, chat activity will be hidden meanwhile, and they can watch it live at
`https://<domain>/architecture` and `https://<domain>/development-steps` (or `http://<IP>:<port>` in IP mode).
Those realtime pages pulse each node as sub-steps open/deploy/close — the progress view while the chat is silent.

## What it reuses (does not reinvent)

- `compose-frozen-template` (section + stub posts) · `manage-content-collections` create-page
  (clone one stub) — the executors. `owner_deploy_rebuild_slot` semantics for deploy. The
  development-step files (`DEVELOPMENT-STEPS/`) and `deployment_records` table, per the project's
  development methodology (`CRUD-DOCS/workspace-standards/development-methodology.md`, `CLAUDE.md §6`).

## When NOT to use

- Authoring a real article body (not stub text) → that is a later capability (design-system step),
  not this. This orchestrator stands up structure through the step lifecycle; it does not write prose.

Self-sufficient project skill: shipped to every agent (`.agents` + `.claude/.gemini/.qwen` + Hermes).
It does not depend on Hermes — any single agent can run the frozen process on its own.
