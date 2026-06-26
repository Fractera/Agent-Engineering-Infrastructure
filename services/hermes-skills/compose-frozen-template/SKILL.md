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
  Self-sufficient: no Hermes, no other agent required.
version: 1.0.0
metadata:
  hermes:
    tags: [constructor, frozen, template, compose, primitive, envelope, news, blog, documentation, catalogue, structure, page-group]
    related_skills: [create-multilingual-content-entry, propose-new-agent-skill-or-mcp, scaffold-declared-route-into-component-skeleton]
---

# compose-frozen-template

Stand up an entire structure by **composing** it from the Frozen Template Constructor —
a small basis of vetted frozen bricks, assembled by **file copy + token substitution,
no code generation**, so any model produces the same result in seconds. Full strategy:
`CRUD-DOCS/workspace-standards/frozen-template-constructor.md`.

This skill is **self-sufficient**: plain file operations plus one HTTP GET. It does NOT
depend on Hermes, memory, or any other agent.

## 🗣️ Hermes: talk to the OWNER in plain language only (mandatory)

You (Hermes) speak to the site owner, who is **NOT a developer**. The technical axes
below (source, depth, rendering, roles, format, envelope, engine version, sample count,
parser-fs, tsc, language codes) are **internal** — they all have safe defaults. **Never
put them to the owner.** The owner reported they could not even choose — that means the
questions were developer questions. Translate, default, and act.

- **Default everything you can, silently.** "Add a news section" needs nothing more:
  compose with source=files, depth=1, static, format=news, samples=2, roles=off
  (everyone can see it), languages = whatever the app is already set to.
- **Ask only what an ordinary person can answer, and only if truly necessary** — in one
  short, everyday sentence, never a technical questionnaire:
  - "What should this section be called?" — only if they did not say.
  - "Should everyone see it, or only signed-in members?" — only if it matters (default: everyone).
  - "Which languages?" — only if the app's languages are not already set; say language
    names ("English, Russian"), never codes, never "BCP-47".
- **Never ask** "what data source / how deep / static or dynamic / how many sample posts
  / which engine version / which roles by name" — choose the default and move on.
- **Never run `npm`/`tsc`/`gen:lists` yourself** (you have no slot terminal — that path
  is for the coding agents). The composer already wrote everything.
- **Never ask the owner to paste a deploy secret.** To make the change visible, call
  `owner_deploy_rebuild_slot` (the deploy tool); if it is unavailable, just say "press the
  Deploy button in the footer".
- The §8.2 confirm before writing files is still required, but phrase it plainly:
  *"I'll create a News section in English and Russian with two sample posts you can
  replace, then rebuild so it shows up. Go ahead?"* — not a list of axes.

(This plain-language rule is Hermes-only: the coding agents — Claude Code, Codex, Gemini,
Qwen, Kimi — keep the technical phrasing below, because a developer drives them.)

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
   the change."** Either way the rebuild is part of the task, not optional — a composed
   structure that is never rebuilt looks like "nothing happened" (the owner saw exactly this).
   **Never ask the owner to paste a deploy secret into the chat** — deploy is the tool's job
   or the owner's button, never a secret handed over in conversation.
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
  `{ tab, format, languages, labels, samples, source?, depth?, roles? }`. Always
  `dry_run: true` first to preview + confirm, then call for real.
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

## Confirm before mutating (mandatory)

Composing writes files. Restate first and wait for explicit confirmation:
> If I understood correctly: compose a **<format>** structure at **/<tab>**
> (source **<source>**, depth **<depth>**, **<langs>**, roles **<roles>**), with
> **<N>** placeholder documents. Shall I proceed?

## Source of truth (do not duplicate)

The basis (registry + primitives + providers + aspects + the vetted engine) lives in
the closed store `services/data/frozen-templates/`, served by the data service. The
composer is `compose-frozen-template.mjs`. If the page standard changes, update the
brick in the store — not a parallel doc. Strategy: `frozen-template-constructor.md`.

This is a self-sufficient project skill: the same `compose-frozen-template` is shipped
to every agent (`.agents/skills` + `.claude/.gemini/.qwen/.kimi/skills` + Hermes). It
does not depend on Hermes existing — any single agent can compose on its own.
