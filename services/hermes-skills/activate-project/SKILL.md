---
name: activate-project
description: >
  Activate a guest project deployed into the app slot (:3000) — make it a first-class
  Fractera project: add the standard workspace pages and migrate its cloud dependencies
  (DB / storage / auth / vector store) onto this server's substrate. Use right after a
  fresh deploy whose framework is not fractera-pro. Never activate without the owner's go.
version: 1.0.0
metadata:
  hermes:
    tags: [activation, app-slot, guest-repo, migration, workspace-pages, onboarding]
    related_skills: [choose-agent, delegate-task, record-deployment]
---

# activate-project

Skill for **activating a guest project** that was deployed into the app slot
(`/opt/fractera/app`, served on :3000). Fractera now deploys ANY repository — a
fresh starter, our reference project (Fractera-Pro), or the user's own public
repo. "Activation" is the step that makes that guest behave like a first-class
Fractera project: it gains the standard page set and its cloud dependencies are
migrated onto this server's substrate. Offer it right after a fresh deploy.

This skill is the JUDGEMENT. The facts about what landed in the slot are in
`/opt/fractera/app-slot.json` (`{framework, contract, repoUrl}`, written by
bootstrap). Read that first.

## When to offer activation

After a deploy whose `app-slot.json.framework` is **not** `fractera-pro` — i.e.
an empty starter or the user's own repo. Fractera-Pro already ships activated.
A plain starter or a cloud-coupled repo benefits most. Ask the owner once:

> "Your project is live. Want me to activate it — add the Fractera workspace
> pages and move any cloud database / storage / auth / vector store onto this
> server? You can also skip and keep it exactly as is."

Never activate without the owner's go — it edits their code.

## The invariant: one scenario for every repo

Every activated project ends up working the SAME way, so one set of docs covers
any repo. Do not invent a per-repo flow — follow these four moves in order.

### 1. Read (or create) the guest's own instruction

The slot is governed by the guest repo's instruction file, not by ours. Look for
`/opt/fractera/app/AGENTS.md` (or `CLAUDE.md`).
- **Found** → obey it. It is the source of truth for the guest's build/run/stack.
- **Missing** → CREATE it: detect the stack (read `package.json`, framework
  config), record the canonical `build` and `start` commands, fix the run to bind
  **:3000**, and write down how this project reaches the substrate (below). From
  then on every agent reads that file first.

Static vs dynamic is the guest's choice — do not impose ours.

### 2. Detect the stack and runtime contract

From `app-slot.json.contract` + `package.json`:
- **Contract B** (Node process on :3000 — Next/Nuxt/Remix/SvelteKit-node): the
  current first-class path. `npm run build` + `npm start` already work.
- **Contract A** (static folder served on :3000 — React/Vue/Angular/Astro/Svelte):
  supported soon; if you meet one now, say so honestly and stop rather than
  half-activate.

### 3. Embed the standard page set (adapted to the stack)

The six workspace pages are the universal standard — they make any project
introspectable and AI-drivable the same way:
`/architecture` · `/ai-core` · `/patterns` · `/documents` ·
`/development-steps` · `/ai-draft-settings`.

The canonical implementation lives in **Fractera-Pro** (the reference repo).
- **Next guest** → port the pages from Fractera-Pro and wire their routes/APIs.
- **Other stack** → reimplement the SAME six capabilities idiomatically for that
  framework (a routes/architecture view, an AI-entities view, a patterns store, a
  knowledge-base CRUD that ingests into Company Memory, a development-steps
  journal, an AI-draft-settings mirror). Same capabilities, native to the stack.

Keep their file-system source-of-truth model (folders on disk, not a hidden DB)
so they behave identically across projects.

### 4. Migrate cloud dependencies onto the substrate

A guest repo often depends on cloud services we do not host. Move each to the
local substrate and rewrite the guest's config/SDK calls to point at it:

| Guest's cloud dependency | Substrate target (already on this server) |
|---|---|
| Cloud Postgres/MySQL, Supabase/PlanetScale DB | SQLite at `APP_DB_PATH=/opt/fractera/app/data/app.db` (helpers in `lib/db/`); or the data service `REMOTE_DATA_URL=http://localhost:3300` (Bearer `DATA_SECRET`) |
| S3 / Supabase Storage / Cloudinary | Media/object storage on the data service `:3300` (`NEXT_PUBLIC_MEDIA_URL`); upload + thumbnails + `POST /media/generate-icons` |
| Auth0 / Clerk / Supabase Auth | NextAuth at the auth service `:3001` (`AUTH_SERVICE_URL`); read identity client-side via `/api/me` |
| Pinecone / cloud vector DB | Company Memory (LightRAG) `LIGHTRAG_URL=http://localhost:9621` (`LIGHTRAG_API_KEY`) |

These env values are already written into `/opt/fractera/app/.env.local` by
bootstrap — the guest reads them, you do not re-issue secrets. If a dependency has
no substrate equivalent, tell the owner plainly rather than silently dropping it.

## How to do the work

Activation writes code, so delegate the actual edits to a coding agent
(`owner_delegate_task_to_platform` / `_best_platform`) — first check readiness
(`choose-agent` skill). Drive it page-by-page and dependency-by-dependency; do not
attempt the whole migration in one blind shot. Record each deployed change with
the `record-deployment` skill so the owner sees the activation in the Product Loop.

## Verify before calling it done

1. The guest still builds and serves on :3000 after each change (deploy loop).
2. Each embedded page renders and reads its on-disk source.
3. Each migrated dependency works against the substrate (a real read/write), not
   just "compiles". Two independent proofs per the project's definition of done.
