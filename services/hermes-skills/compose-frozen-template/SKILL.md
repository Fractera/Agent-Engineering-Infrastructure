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

## 🗣️ Hermes — LIGHT, AUTONOMOUS, with live progress (mandatory)

You (Hermes) serve the site owner, who is **NOT a developer** and wants a **fast, near-
autonomous tool**. A reversible, additive request ("add a news section", "add a blog")
must feel like **ONE step**, not a questionnaire and not a chain of approvals.

- **NO brainstorm, NO technical questionnaire.** Brainstorming belongs to the coding
  agents (Claude Code), NOT to you. Default every technical axis **silently**:
  source=files, depth=1, static, format, samples=2, roles=off, languages = the app's
  current set. Never name source / depth / rendering / roles / format / engine / samples /
  parser-fs / tsc / language-codes to the owner.
- **ONE light confirmation, then act autonomously — no dry-run round-trips, no second
  rebuild confirmation.** State what you'll do in a single plain sentence and go on a
  single "yes":
  > "I'll add a News section (English + Spanish, two sample posts) and publish it — go ahead?"
  One "yes" = **compose AND publish**, end to end. Do NOT call the tools in `dry_run` to
  "preview", and do NOT ask again before rebuilding. (Heavy step-by-step confirmation is
  ONLY for **destructive/irreversible** actions — deleting a section, wiping, provisioning.)
- **Ask only if something an ordinary person must decide is genuinely missing** — the
  section's name, or "everyone, or only signed-in members?" — one short everyday sentence.
- **🔴 Stream progress — NEVER go silent.** Post a short line at EACH phase so the owner
  always sees forward motion (this is what makes it feel alive, not hung):
  > "Creating the section…"  →  "Done — files created. Rebuilding the site (~2 min)…"  →
  > "Live: https://&lt;domain&gt;/en/news and /es/news."
  Never end a turn without saying what you just did and what is next.
- **Publish it yourself.** After composing, call `owner_deploy_rebuild_slot` **directly**
  (it IS the Deploy button) — no separate confirmation, no deploy secret in chat. If the
  tool is unavailable, say "press the Deploy button in the footer".
- **Never run `npm`/`tsc`/`gen:lists` yourself** (no slot terminal — that's the coding agents).
- **Report the live link from `view_urls`/`site_url`** (mode-aware https) — never an
  internal/plain-HTTP host, never your own curl to "verify" (`COMPLETED` already passed a
  health check).

(Hermes-only: the coding agents — Claude Code, Codex, Gemini, Qwen, Kimi — keep the technical
phrasing below, because a developer drives them.)

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
3. **Compose.** After the single light confirmation (Hermes) — or directly for a coding
   agent — call `owner_template_compose_structure` for real (no `dry_run` round-trip for a
   reversible create). **The composer already wrote everything — including
   `_list.generated.ts` and the package.json scripts. Do NOT run `npm run gen:lists` /
   `npx tsc` yourself** (and never in `/root/workspace` — the slot is elsewhere; that path
   is for a coding agent that owns the slot terminal, not for you). The owner can replace
   the placeholder copy/image later.
3a. **🔁 Rebuild so the change is VISIBLE — mandatory, never skip (any task that wrote
   files).** The slot runs in production mode: files you wrote are NOT visible until the
   slot is rebuilt. Finish by **calling the deploy MCP tool `owner_deploy_rebuild_slot`
   directly** — same "Deploy" the footer button does; it waits for the result. This is
   part of the single "yes", **not a second confirmation** (a reversible create does not
   re-prompt). Emit a progress line before it ("Rebuilding the site, ~2 min…"). If the tool
   is unavailable, **remind the owner: "press the Deploy button in the footer."**
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
  `{ tab, format, languages, labels, samples, source?, depth?, roles? }`. Call it for
  real — `dry_run: true` is available only when you genuinely need a preview (an ambiguous
  or destructive case), never as a routine extra round-trip for a reversible create.
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

## Confirm — proportional to risk (not a gauntlet)

Composing a structure is **reversible and additive** → **ONE** light confirmation, then
act end to end (compose + publish) with progress. Do not re-confirm per tool, do not
dry-run as a routine preview. For Hermes that one line is plain language (see the Hermes
section); for a coding agent it can be the technical restate. **Full step-by-step
confirmation is reserved for DESTRUCTIVE / irreversible actions** — deleting a section,
wiping, provisioning a server.

## Source of truth (do not duplicate)

The basis (registry + primitives + providers + aspects + the vetted engine) lives in
the closed store `services/data/frozen-templates/`, served by the data service. The
composer is `compose-frozen-template.mjs`. If the page standard changes, update the
brick in the store — not a parallel doc. Strategy: `frozen-template-constructor.md`.

This is a self-sufficient project skill: the same `compose-frozen-template` is shipped
to every agent (`.agents/skills` + `.claude/.gemini/.qwen/.kimi/skills` + Hermes). It
does not depend on Hermes existing — any single agent can compose on its own.
