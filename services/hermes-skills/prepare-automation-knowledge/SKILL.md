---
name: prepare-automation-knowledge
description: >
  Prepare the KNOWLEDGE an automation/project needs BEFORE any code is written: at planning time
  explicitly consider the class of external tools (web search like exa.ai, platform APIs like the
  YouTube API, ready-made skills/MCP connectors found on the internet); default to DELEGATING the
  build to a coding agent with the fullest possible specification file; and — because coders
  usually have NO internet — transfer the external documentation they need onto the workspace disk
  (CRUD-DOCS) + Company Memory with the owner's agreement, token-lean (metadata only, the document
  body never enters the model context). Sequence: find → agree → transfer → ingest → reference the
  local paths in the coder's spec file. Via MCP: owner_docs_transfer_external_documentation (:3230).
version: 1.0.0
metadata:
  hermes:
    tags: [automation, project, knowledge, documentation, transfer, ingest, rag, memory, external, api, exa, youtube, delegate, spec, specification, internet, offline, courier]
    related_skills: [route-project-or-pages-request, delegate-task, persist-env-var-with-rebuild, propose-new-agent-skill-or-mcp]
---

# prepare-automation-knowledge

Run this at the **planning stage of every automation/project** (after the
`route-project-or-pages-request` fork said PROJECT), before anything is built.

> **Projects layer manifest.** Fractera agents do not run an automation once on request — they
> build a platform for developing **repeatable** automations: standardized reuse, a visual
> interface, input and result data in the local DB and vector memory, quick switching from the UI.
> Hermes plus a coding agent build a finished-cycle tool — an **"n8n for one single task"**: the
> owner does not recreate the task, they open it in the UI, run it and track the result.

## The three planning truths

1. **The world has ready tools — name them in the plan.** An automation almost never starts from
   zero. Explicitly consider, per project: web search services (e.g. **exa.ai**), platform APIs
   (e.g. the **YouTube API**, Telegram, RSS feeds), and **ready-made skills / MCP connectors
   published on the internet** — search for an existing one before anyone builds a new one. Every
   chosen integration becomes an env key materialized ONLY via the `persist-env-var-with-rebuild`
   channel (setter → `app/.env.local` → rebuild). Never hardcode keys.
2. **Delegation is the default.** The planner (Hermes or any orchestrating agent) works in tandem
   with a usually MORE CAPABLE coding agent. Instead of building the automation yourself, hand it
   off with the **fullest possible specification file**: the goal, the flow, the external tools
   and their env keys, the cron intents, acceptance criteria, and the LOCAL paths of every
   document the coder needs. The spec file is the planner's main deliverable.
3. **The coder usually has NO internet.** Whatever external documentation the build depends on
   must be ON DISK before the handoff — that is the doc-transfer below. Apply it whenever
   possible when creating automations.

## The sequence: find → agree → transfer → ingest → reference

1. **Find** the documentation the automation depends on: the API reference pages, the SDK guide,
   the auth/quota pages. Prefer the few most useful pages over whole sites — the transfer has a
   reasonable-volume guard (default 2 MB per document, hard cap 5 MB).
2. **Agree with the owner** (mutating action → confirm first, «Правильно ли я вас понимаю…»):
   name each URL, the target file, and that it will also go to Company Memory. The MCP tool
   enforces this: `dry_run=true` (default) returns the plan + a ready confirm prompt; only an
   explicit `dry_run=false` call executes.
3. **Transfer** — via MCP `owner_docs_transfer_external_documentation` (:3230), one call per URL:
   the bridge downloads the page, converts HTML to clean markdown, and saves it under
   `CRUD-DOCS/external/<slug>.md` in the app slot. **Token economy is the point:** the document
   body NEVER enters the model context — the tool returns ONLY metadata (path, bytes, title,
   table of contents). Never fetch a doc into the chat to save it.
4. **Ingest** happens in the same call (`ingest:true`, default): the bridge submits the saved
   text to Company Memory (LightRAG `POST /documents/text`) so the coder can also find it by a
   semantic query. If LightRAG is unreachable the file is still saved — activate it later from
   the `/documents` page.
5. **Reference** the saved LOCAL paths in the coder's specification file: "read
   `CRUD-DOCS/external/<slug>.md` (source: <url>)". The coder finds everything on its own
   filesystem or via a Company Memory query — no internet needed.

## Without Hermes / without the bridge (lone CLI agent)

The sequence is the same; only step 3 changes. If YOU have internet access, fetch the page
yourself and write the cleaned markdown to `CRUD-DOCS/external/<slug>.md` (front-matter:
`source:`, `fetched:`, `purpose:`) — still with the owner's agreement first, and still WITHOUT
quoting the full document back into the conversation. Then submit the ingest with a plain POST to
`$LIGHTRAG_URL/documents/text` (header `X-API-Key: $LIGHTRAG_API_KEY`, body
`{ "text": …, "description": "crud-docs | external/<slug>.md" }` — both env vars are in the
slot's `.env.local`). If you have no internet either, list the needed URLs in the spec file and
ask the owner to provide the material.
