---
name: compose-frozen-template
description: >
  Add a whole STRUCTURE to the site (a news feed, a blog, a documentation tree, a
  catalogue) by COMPOSING it from the Frozen Template Constructor — vetted frozen
  bricks assembled by file copy + token substitution, with ZERO code generation, so
  any model gives the identical result. Use when the owner says "make me a news
  page", "add a blog", "I want documentation", "add a catalogue". The composer
  (compose-frozen-template.mjs / the owner_template_compose_structure MCP tool)
  MATCHES the request to a primitive by its envelope (100%-fit on every axis or it is
  NOT that primitive), installs the shared engine if absent, and composes the router
  + placeholder documents through two seams (list provider + uniform aspects). If
  nothing fits, REFUSE HONESTLY naming the failing axis and offer to harvest a new
  brick or use classic development — never force a bad fit, never generate code.
  Also composes a PROJECT PAGE (the Projects layer starter interface: description +
  react-flow process diagram + cron-queue and results tables + a durable Workflow
  DevKit workflow mirroring the diagram, with its run-trigger API route) from the
  mount-based 'project-page' primitive via owner_template_compose_project_page — use
  when the owner wants a private automation / internal tool ("automate publishing on
  a schedule", "a tool for my own use"), NOT a public page group.
  Self-sufficient: no Hermes, no other agent required.
version: 1.2.0
metadata:
  hermes:
    tags: [constructor, frozen, template, compose, primitive, envelope, news, blog, documentation, catalogue, structure, page-group, project, automation, react-flow, workflow, durable]
    related_skills: [create-multilingual-content-entry, propose-new-agent-skill-or-mcp, scaffold-declared-route-into-component-skeleton]
---

# compose-frozen-template

Stand up an entire structure by **composing** it from the Frozen Template Constructor —
a small basis of vetted frozen bricks, assembled by **file copy + token substitution,
no code generation**, so any model produces the same result in seconds. Full strategy:
`CRUD-DOCS/workspace-standards/frozen-template-constructor.md`.

This skill is **self-sufficient**: plain file operations plus one HTTP GET. It does NOT
depend on Hermes, memory, or any other agent.

## The mental model (read this before acting)

- The constructor is a **composer over a basis of primitives** — not a catalogue of
  finished templates, and not a code generator.
- **Two-Slot Law:** every property is either a **list provider** (where the children
  come from — Slot A) or a **uniform aspect** (a rule applied identically at every
  level — Slot B). Nothing else. They never interact.
- **Base axes select a primitive:** `source` (files | db-at-build | runtime) × `depth`
  (1–4) × `rendering` (static | dynamic-descriptor). **Aspect axes** are toggles a
  primitive supports: `i18n`, `roles`.
- Today the basis has **one** harvested brick: `files-depth1` (a flat, file-backed,
  multilingual list — news / blog / docs feed). Everything else is roadmap.

## Decision flow (do exactly this)

1. **Project the request onto the envelope axes.** What is the data source? how deep
   is the structure? static or inherently dynamic? which roles? which languages?
2. **Match by 100%-fit.** Call `owner_template_list_primitives` (or read the store
   registry) and find the primitive whose BASE axes (source, depth, rendering) all
   equal the request, and which SUPPORTS the requested aspects.
   - **Fits →** compose it (step 3).
   - **Another primitive fits →** compose that one.
   - **None fits →** HONEST REFUSAL naming the failing axis (step 4).
3. **Compose (confirm first).** Restate exactly what will be created, get explicit
   confirmation, then call the composer MCP tool (`owner_template_compose_structure`).
   **The composer already wrote everything — including `_list.generated.ts` and the
   package.json scripts. Do NOT run `npm run gen:lists` / `npx tsc` yourself** (and
   never in `/root/workspace` — the slot is elsewhere; that path is for a coding agent
   that owns the slot terminal, not for you). Just tell the owner they can replace the
   placeholder copy/image later.
3a. **🔁 Rebuild so the change is VISIBLE — mandatory, never skip (any task that wrote
   files).** The slot runs in production mode: files you wrote are NOT visible until the
   slot is rebuilt. Finish by **calling the deploy MCP tool `owner_deploy_rebuild_slot`**
   (dry_run first to say "I'll rebuild, ~2-4 min, ok?", then for real) — it runs the same
   "Deploy" the footer button does and waits for the result. If that tool is not available
   to you, **remind the owner: "press the Deploy button in the footer to rebuild and see
   the change."** Either way the rebuild is part of the task, not optional.
   **Never ask the owner to paste a deploy secret into the chat** — deploy is the tool's job
   or the owner's button, never a secret handed over in conversation.
3b. **Report the result with the CORRECT public URL — never an internal/plain-HTTP host.**
   `COMPLETED` from `owner_deploy_rebuild_slot` already means the slot passed a health check —
   **do NOT run your own `curl` to "verify"**, and NEVER curl an internal name like
   `http://fractera-app:3000` or `http://127.0.0.1:3000` (both are unprotected/internal; on a
   secure deployment that is the wrong thing entirely). The compose result gives you
   **`view_urls`** and the deploy result gives you **`site_url`** — both are mode-aware
   (secure → `https://<domain>/<lang>/<tab>`, IP → `http://<ip>:3000/...`). Report THOSE to the
   owner ("Done — your news section is live at https://<domain>/en/news and /es/news"). If you
   ever do want to self-check a page, use the mode-aware `site_url`, never an internal host.
4. **Honest refusal + next step.** Say which axis failed in plain words (e.g. "a live
   dashboard is per-user and dynamic — that is the *rendering*/*source* axis, which no
   frozen brick serves"). Then offer ONE of:
   - **(a) propose a new brick** — only if the shape is **proven by live development**,
     **repeats** (rule-of-three), and **parameterises cleanly**. You PROPOSE (a
     `propose-new-agent-skill-or-mcp` draft / a new step); you do NOT self-create, and
     the heavy harvest analysis runs only after the architect says go.
   - **(b) classic development** within the existing architecture — if the shape is
     new / one-off / unstable / risky.
   Never force the wrong primitive; never generate the structure from scratch.

## Match examples (calibrate on these)

- "make me a news section" → `(files, depth-1, static)` → **compose** `files-depth1`.
- "add documentation by category" → `(files, depth-2)` → **refuse: axis depth** (no
  depth-2 brick yet) → offer harvest/classic.
- "a product catalogue from the database" → `(db-at-build, depth-1)` → **refuse: axis
  source** (db-at-build is a declared, not-yet-harvested provider) → harvest/classic.
- "a live dashboard" → per-user, dynamic → **refuse: axis rendering/source** → classic
  development (the dynamic-descriptor brick is roadmap).
- "news, but only logged-in users see it" → `(files, depth-1, static)` + roles aspect
  → **compose** `files-depth1` with `--roles user` (the role gate is injected uniformly).

## How to compose

- **MCP (every agent):** `owner_template_compose_structure` with
  `{ tab, format, languages, labels, samples, source?, depth?, roles?, menus?, children_as_dropdown? }`.
  Always `dry_run: true` first to preview + confirm, then call for real.
  - `menus?` / `children_as_dropdown?` write the **group manifest** (`_data/group.ts`) — menu
    placement read by the site's menu system. Slots `top`/`footer`/`left`/`right`, each
    `{ enabled, order }`; default every slot off, order 10 (explicit opt-in). It is
    **registration metadata, not a Slot A/B property** — the menu components are a separate
    consumer, not part of composing the structure.
- **Standalone (lone agent, no MCP):**
  ```bash
  curl -s -H "X-Agent-Identity: <you>" http://localhost:3300/frozen-templates/registry > /tmp/reg.json
  # the host unpacks the store tree to /tmp/frozen-templates/ , then:
  node .agents/skills/compose-frozen-template/compose-frozen-template.mjs \
    --store /tmp/frozen-templates --out . \
    --source files --depth 1 --rendering static \
    --tab news --format news --languages en,ru --label-en News --label-ru Новости --samples 2 --roles off
  npm run gen:lists && npx tsc --noEmit
  ```

## Reading & editing an existing group (menu settings, path, roles, languages)

Composing is only creation. To **see** or **edit** groups that already exist, use the sibling
emitter `manage-group.mjs` (shipped beside this composer) and its MCP tools:

- **`owner_template_list_groups`** — every composed group + its manifest (`slug`, `languages`,
  `roles`, `menus`, `childrenAsDropdown`). Read-only. Perceive before you edit.
- **`owner_template_update_group`** `{ tab, slug?, roles?, languages?, menus?, children_as_dropdown? }`
  — deterministic edits, NO codegen. `slug` renames the folder (path); `roles` rewrites the layout
  gate; `languages` adds/removes UI chrome (within the app's set); `menus` (`{top,footer,left,right}`,
  each `{enabled,order}`) turns a menu on and orders the button; `children_as_dropdown` flips child
  expansion. `dry_run: true` first to preview + confirm, then call for real; then rebuild.

## Confirm before mutating (mandatory)

Composing writes files. Restate first and wait for explicit confirmation:
> If I understood correctly: compose a **<format>** structure at **/<tab>**
> (source **<source>**, depth **<depth>**, **<langs>**, roles **<roles>**), with
> **<N>** placeholder documents. Shall I proceed?

## 🧩 Project page (Projects layer, step 178)

> Fractera agents do not deliver an automation in final form straight from a request — they build a
> platform for developing repeatable automations. A project is a finished-cycle tool — **an n8n for
> one single task**: the owner opens it in the UI, runs it and tracks the result.

A **project** is a PRIVATE application level (architect+manager only), not a public page group.
When the owner asks for an automation / internal tool for their own use, compose the starter
interface from the mount-based `project-page` primitive:

- **MCP (every agent):** `owner_template_compose_project_page` with
  `{ category, project, title?, purpose?, automation?, how?, cron?, integrations? }`.
  `dry_run: true` first to preview + confirm, then for real; then rebuild.
- **Standalone:** `node compose-frozen-template.mjs --store <dir> --out . --primitive project-page
  --category automation --project <slug> --title "…" [--cron true] [--integrations '[…]']`.

What it differs in (vs a tab structure): mounts OUTSIDE `[lang]` into
`app/(projects)/projects/<category>/<project>/`; access (architect+manager) and language (site
default, monolingual) are INHERITED from the zone layout — no roles/i18n/menus/engine/parser-fs
apply. `category` must be an existing category folder (automation | fractera-pages | personal |
other); `project` is a kebab-case English slug — the folder name IS the registry, so the project
appears in the account drawer Projects accordion automatically after a rebuild. The primitive
declares its npm dependencies (`@xyflow/react`, `workflow`); the composer VERIFIES them in the
slot's package.json and refuses honestly if missing — it never installs packages. `cron` /
`integrations` are RECORDED in the project README declaration (machine block) only; env keys are
materialized later via the env setter + rebuild.

The composed page is a STARTER: placeholder description, a generic 4-node process diagram (movable
nodes + per-node info panel), two empty tables — plus the **durable workflow** (step 183.D):
`_workflow/definition.ts` (a Workflow DevKit `"use workflow"` function whose steps
`work -> store -> publish` mirror the diagram nodes), `_workflow/journal.ts` (journals each run into
`project_cron_runs` through the slot's db layer — the page tables show workflow runs with zero page
changes) and the trigger route `app/api/projects/<category>/<project>/run` (`POST`, gated by the
`/api/*` auth gate — callers send `X-Agent-Identity`). **Scheduling:** `fractera-cron` stays the
ONLY scheduler — to run the workflow on a schedule, declare a `cron.json` http job pointing at the
trigger route (the runner already sends the agent-identity header); WDK's own scheduling is not
used. Local World state persists under `WORKFLOW_LOCAL_DATA_DIR` (`/opt/fractera/.workflow-data`
on a VPS, outside the swappable slot).

**Finishing it for the real project is a coding-agent handoff** — edit `_data/description.ts`,
`_data/flow.ts` (the diagram is DATA, never JSX) and the step bodies in `_workflow/definition.ts`
(keep the diagram and the workflow isomorphic: what the diagram shows is what the workflow does).

## 🌐 Adding a LANGUAGE → NOT this tool

To **add a new language to an existing site**, do NOT re-compose — composing **overwrites** existing
content. Use the **expand-site-language** skill / `owner_content_add_site_language`: it adds a per-page
locale across every group and post (seeded with the default language, noindex until translated) without
touching the existing content. Composing is for a NEW structure, never for adding a language to an old one.

## Source of truth (do not duplicate)

The basis (registry + primitives + providers + aspects + the vetted engine) lives in
the closed store `services/data/frozen-templates/`, served by the data service. The
composer is `compose-frozen-template.mjs`. If the page standard changes, update the
brick in the store — not a parallel doc. Strategy: `frozen-template-constructor.md`.

This is a self-sufficient project skill: the same `compose-frozen-template` is shipped
to every agent (`.agents/skills` + `.claude/.gemini/.qwen/.kimi/skills` + Hermes). It
does not depend on Hermes existing — any single agent can compose on its own.
