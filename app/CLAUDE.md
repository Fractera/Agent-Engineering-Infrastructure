# CLAUDE.md

Instructions for Claude Code working inside this project. Read this file first, every session. Re-read before every new task.

---

## 1. Operating environment

**By default you are running in PRODUCTION.** This is unusual but intentional: ~95% of work in this project happens directly against the live system, not in a dev sandbox. Treat every change as user-visible by default.

**Detect mode at session start:**

```bash
# Brain reachable? → production
curl -s --max-time 2 http://localhost:3002/api/rag/status >/dev/null 2>&1 && echo "PROD" || echo "DEV"

# Server path exists? → production
test -d /opt/fractera/app && echo "PROD"
```

**Production mode (default):**
- Changes are **not visible to the user until you deploy** (see §11)
- Company Brain is online → use it
- Every "task complete" requires deploy + verification
- Mistakes are user-facing → demand proofs before reporting done

**Dev mode (exception):**
- Company Brain is offline → skip Brain queries, use journal only
- Database and file storage still work normally
- Hot reload — changes visible immediately, no explicit deploy needed
- Same dialog discipline, same proof requirements

Open the session by stating which mode you detected.

---

## 2. Dialog discipline

**Ask before you build.** Default to maximum dialog density at the start of every task. Surface unknowns, scope ambiguities, edge cases, constraints. One well-targeted question saves an hour of wrong work.

**Opening line of every new task:**
> *"I have a few clarifying questions before starting. You can stop me at any moment by saying 'go' or 'proceed' — I'll lock in what you've given and start work."*

Then ask. Real questions, not formalities.

When the user says **go / proceed / делай / хватит** → stop asking, commit to what you have, start. No more questions until you hit a real blocker.

**Focus-shift guardrail (background thought, always on):**

If the user switches focus from one project area to a clearly different one mid-conversation, pause and recommend a clean handoff:

> *"I notice we're shifting from {area A} to {area B}. Before continuing I'd suggest: (1) let me write current learnings to a doc and ingest into Brain, (2) start a fresh chat for the new topic. This avoids auto-compaction which silently degrades precision — a documented handoff preserves much more. If you meant to stay on {area A}, ignore me."*

Recommendation only — never enforce. If the user wants to continue in the same chat, do so. The goal is to surface the option early enough that auto-compaction doesn't happen quietly. Treat context bloat as one of the highest hidden costs in a long session.

---

## 3. Workspace boundaries

You work inside this folder only (`/opt/fractera/app/`).

**Forbidden — never read, write, or analyze:**
- `/opt/fractera/bridges/` — Fractera platform bridges (system code)
- `/opt/fractera/services/` — Fractera services: auth, data, rag (system code)
- Anything outside `/opt/fractera/app/`

If a request requires touching forbidden zones, refuse and explain the boundary.

---

## 4. Workflow — strict order

1. **Detect mode** (§1) and announce it
2. **Read history**: the completed steps in `DEVELOPMENT-STEPS/COMPLETED-STEPS/`, the open ones in `DEVELOPMENT-STEPS/NEW-STEPS/`, and related `reports/`. The **/development-steps** page is the visual view of these files.
3. **Ask clarifying questions** (§2) until the user says go
4. **Open a step** — create `DEVELOPMENT-STEPS/NEW-STEPS/<NN>-<slug>.md` (or via the /development-steps page): name, importance (optional/mandatory/critical), description, known constraints, subtasks, out-of-scope
5. **Query Company Brain** (§7) if in production mode
6. **Write code** with code discipline (§11). **Reuse first:** check `PATTERNS/PATTERNS/` (UI Elements, Sections, Brandbook) — reuse or extend an existing pattern instead of re-deriving it. The **/patterns** page is the visual view; format in `docs/patterns.md`.
7. **Produce 2 independent proofs** (§5) — non-negotiable
8. **Ask the user for deploy permission** (§5)
9. **On user's "yes" → deploy** (§12) and verify the live URL. **Before deploying, read `PATTERNS/ANTI-PATTERNS/`** — the flat list of deployment pitfalls — so you do not repeat them.
10. **Feed Company Brain** (§8) — push reports/docs back to Brain
11. **Complete the step** — move its file `DEVELOPMENT-STEPS/NEW-STEPS/<NN>-<slug>.md` → `DEVELOPMENT-STEPS/COMPLETED-STEPS/` and set its completion date (the `completedAt` field + `status: completed` in the step's machine block). It then appears under **Completed steps** (read-only history). See `docs/development-steps.md` for the file format.

Never skip steps. Without step 2, you repeat solved problems. Without 7, you ship bugs. Without 8, you never get user confirmation. Without 10, Brain stays static.

---

## 5. Definition of "done"

A task is **not done when code is written**. A task is done only when ALL of these are true:

1. **Two independent proofs** the change works. "Independent" means each proof tests a different axis — not two versions of the same check. Examples of valid pairs:
   - Page renders the new component **AND** DB row appears with the new data
   - API returns 200 with correct payload **AND** UI updates on click
   - File is created on disk **AND** referenced correctly in DB
2. **Both proofs reported to the user** in plain text (what you checked, what the result was)
3. **User explicitly confirms deploy** — never assume, always ask:
   > *"Proofs found: [A], [B]. Ready to deploy? (yes / no / hold)"*
4. **Deploy succeeds** — `status: COMPLETED` from `/api/deploy/status`
5. **Live URL verified** — you opened it (curl) and confirmed the change is visible

Until ALL five are true, status is **in progress**. Don't say "готово", "done", "completed" prematurely.

If a proof fails:
- Apologize concisely
- Add a sub-task to the current step in `DEVELOPMENT-STEPS/NEW-STEPS/`
- Continue without rationalizing the failure

---

## 6. Journal system — long-term memory

The repository is your memory across sessions. Locations:

| Path | Purpose |
|---|---|
| `DEVELOPMENT-STEPS/NEW-STEPS/<NN>-<slug>.md` | Open steps — one file per active task (number, name, importance, description, to-do). Shown under **New steps** on the /development-steps page. |
| `DEVELOPMENT-STEPS/COMPLETED-STEPS/<NN>-<slug>.md` | Finished steps — moved here with a completion date. Read-only history under **Completed steps**. |
| `docs/development-steps.md` | The standard for the step files (format + how to complete one). |
| `PATTERNS/PATTERNS/<category>/<NN>-<slug>.md` | Reusable code patterns (UI Elements, Sections, Brandbook). Reuse one before re-deriving it. Shown under **Patterns** on the /patterns page. |
| `PATTERNS/ANTI-PATTERNS/<NN>-<slug>.md` | Deployment pitfalls — **read this flat list before every deploy**. Shown under **Anti-patterns** on /patterns. |
| `docs/patterns.md` | The standard for the pattern files (format, declared→stable, how to read a `kind:delete` request). |
| `docs/` | Long-lived architectural docs (ADRs, glossary, domain notes) |
| `reports/errors/*.md` | Bugs and dead-ends — how they were fixed |
| `reports/patterns/*.md` | Reusable working patterns |
| `GLOSSARY.md` | Project-specific terms (edited via the /glossary page) |
| `AI-DRAFT-SETTINGS/<AGENT>/…` | Draft wishes (supplement/replace) for the six agents' real instruction/skill/MCP files. A mirror — an agent applies a draft to the real file; the page never edits originals. Edited via the **/ai-draft-settings** page; format in `docs/ai-draft-settings.md`. |

**Before recommending a solution** — search `reports/` for prior precedent.
**After a non-obvious bug** — write to `reports/errors/`.
**After a clean reusable pattern** — write to `reports/patterns/`.
**After an architectural decision** — write to `docs/ADR-NNN-{slug}.md`.

Every artifact you write here must be ingested into Brain (§8).

---

## 7. Company Brain — read at session start

A knowledge graph of this entire project. **Check availability first thing:**

```bash
curl -s http://localhost:3002/api/rag/status
```

**If available:**
- Query with the user's task:
  ```bash
  curl -X POST http://localhost:3002/api/rag/query \
    -H "Content-Type: application/json" \
    -d '{"query": "<task description>", "mode": "hybrid"}'
  ```
- Use the response as **primary context** — Brain knows the codebase semantically
- For architecture or optimization questions — also recommend the user open the Company Brain panel directly

**If unavailable:**
- Tell the user: *"Company Brain is offline — using local files only. Enable it via Admin → Settings → Company Brain for richer context."*
- Fall back to local files + journal

**Division of labor:** Brain = "where" and "how it works." Journal = "what was done and why."

---

## 8. Feed Company Brain — close the loop

**Brain does not auto-learn.** No file watcher, no background indexer. Brain knows only what you explicitly push. Every important learning you don't push is **lost** — to you next session, to other agents, to the user.

**When to push (mandatory):**
- Architectural decision recorded in `docs/ADR-NNN.md`
- New domain concept documented in `docs/{concept}.md`
- Reusable pattern in `reports/patterns/*.md`
- Non-obvious bug fix in `reports/errors/*.md`
- Glossary term added to `GLOSSARY.md`
- Step completed (moved to `DEVELOPMENT-STEPS/COMPLETED-STEPS/`)

**When NOT to push:**
- Small code edits (Brain re-indexes via the full scan periodically)
- WIP drafts of a step still in `DEVELOPMENT-STEPS/NEW-STEPS/`
- Commits that don't change architecture or learnings

**How to push — targeted (preferred):**

```bash
curl -X POST http://localhost:3002/api/rag/ingest \
  -H "Content-Type: application/json" \
  -H "X-Agent-Identity: claude" \
  -d '{"text": "<full text of the file you just wrote>", "description": "docs/ADR-007-storage-choice.md"}'
```

**How to push — full scan (heavy, use sparingly):**

```bash
curl -X POST http://localhost:3002/api/rag/ingest \
  -H "X-Agent-Identity: claude" \
  -d '{}'
```

**Cost awareness:** each ingest spends OpenAI tokens (~$0.0003 per typical document for entity extraction + embeddings). Cheap but not free. Don't ingest trivial changes.

**Identity in your mental model:** *You are not just a coder — you are Company Brain's hands. Knowledge you produce but don't push is knowledge lost.*

---

## 9. SSL & domain architecture

**This server is IP-first.** No Cloudflare, no DNS through Fractera, no auto-issued SSL. Plain HTTP on the public IP until the user attaches their own domain.

When the user attaches a domain through Admin → Personal Domain, the admin app provisions a Let's Encrypt certificate directly on this server and reloads nginx. That is the only HTTPS path.

**Treat any reference to `cloudflare`, `CF_*`, `/etc/ssl/cloudflare/`, `Universal SSL`, `Origin Cert`, or DNS quotas as legacy** — remove on sight if you touch the surrounding code.

**Hermes special config:**
- PM2 runs Hermes with `--interpreter $HERMES_PY` (it's a Python script, not Node)
- In IP-mode Hermes binds `0.0.0.0` with `--insecure` (no nginx auth gate in front)

---

## 10. Hermes orchestration

Hermes is the orchestration agent that coordinates multi-step work across platforms. It runs at `http://localhost:9119` (dashboard accessible via Fractera Admin → Hermes button).

**When to delegate to Hermes instead of working directly:**
- Task spans multiple AI platforms (e.g. Claude designs + Gemini implements + Qwen reviews)
- Task requires parallel sub-tasks that can run independently
- Task is a long-running pipeline (>3 sequential steps with dependencies)
- You need to track feedback and iterate over multiple sessions

**When NOT to delegate:**
- Task fits in one focused coding session
- Task is architecture/planning work — handle directly
- Task is a simple bug fix or component — handle directly

**How to delegate (if Hermes is running):**
```bash
# Check Hermes status
curl -s http://localhost:9119/health

# Hermes tools available via MCP (ports 3210-3214 per platform):
# delegate_to_platform(platform, prompt)  — specific platform
# delegate_to_best(prompt, criteria)      — auto-select platform
```

**`docs/hermes/` — READ-ONLY ZONE. Never write, edit, or delete files here.**

This directory contains Hermes's closed memory: architectural decisions, project model, feedback history. Only Hermes writes here. Agents can READ these files via Company Brain queries.

---

## 11. Built-in platform capabilities

The platform ships with working solutions. Do not reinvent. For full details, query Company Brain.

| Category | What's already done |
|---|---|
| **Auth + roles** | NextAuth v5, login/register/guest, role-based access — pattern in `(auth)/` |
| **Database** | SQLite with auto-migrations, query helpers in `lib/db/` |
| **Files + media** | Upload, thumbnails, image cropping — Media Service on port 3300 |
| **PWA icons** | Full icon set from one square image — `POST :3300/media/generate-icons` |
| **Protected routes** | Working role-checked example in `dashboard/` |
| **Auto-update** | App syncs from upstream repo — controlled by `UPSTREAM_REPO_URL` env |

This list is **headline only**. Many more capabilities exist (GitHub tooling, deploy, identity tracking, etc.). When unsure if something is built-in — **ask Brain first** before building it.

---

## 12. Code discipline

**Hard limit: 200 lines per file, excluding imports/exports.**

A file exceeding 200 lines must be decomposed immediately — split by responsibility, not by line count. Non-negotiable. If you encounter an oversized file in the area you're editing, decompose it before continuing the requested change.

**Exception — pure data files.** The limit targets logic and cognitive load. Pure data/seed files with no control flow (e.g. a static catalogue, fixtures, a route/config map) are exempt — keep one coherent dataset whole rather than scattering it just to satisfy a line count. The moment such a file grows logic (branches, computation), the limit applies again.

Other rules:
- Edit existing files before creating new ones
- No comments unless the *why* is non-obvious
- No emojis unless the user requests them

**Shell component architecture — mandatory.** Every route and component follows
`docs/shell-component-architecture.md`: `page.tsx` is a thin Server Component, the
entry is `_components/index.tsx`, route-local components live in `_components/`,
reusable ones in `components/` (vendored `components/ui/` exempt), leaf files carry
a `.client`/`.server` suffix that must match their `"use client"` directive, and
each route declares a typed `_meta.ts` (`satisfies RouteMeta`). The `/architecture`
page mirrors the code and flags any drift from these rules. Read that doc first.

---

## 13. Deploy mechanics

Only run this when the user has explicitly approved deploy (§5 step 3).

```bash
DEPLOY_SECRET=$(grep "^DEPLOY_SECRET=" /opt/fractera/bridges/app/.env.local | cut -d'=' -f2)
RESULT=$(curl -s -X POST http://localhost:3002/api/deploy \
  -H "Content-Type: application/json" \
  -H "X-Deploy-Secret: $DEPLOY_SECRET" \
  -d "{\"description\":\"brief description of what changed\"}")
JOB_ID=$(echo $RESULT | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)

while true; do
  S=$(curl -s "http://localhost:3002/api/deploy/status?jobId=$JOB_ID")
  echo $S | grep -o '"status":"[^"]*"'
  echo $S | grep -qE '"status":"(COMPLETED|FAILED|HEALTH_FAILED)"' && break
  sleep 10
done
echo $S
```

- Build takes 2–4 min. Only `app/` is rebuilt.
- On `FAILED` → `log[]` contains errors. Fix and retry. Do not declare "done".
- On `COMPLETED` → fetch the live URL via curl and verify the change is visible. **This is the fifth proof required by §5.**

---

## 14. Agent identity

Include this header on every API call so DB changes are attributed correctly:

```
-H "X-Agent-Identity: claude"
```

Without it, changes are attributed to a generic agent — auditability is lost.

---

<!-- PERMANENT — do not delete -->

## Template — development step file

Every step is one markdown file `DEVELOPMENT-STEPS/NEW-STEPS/<NN>-<slug>.md` (`NN` =
the next global number, `slug` = a few kebab-case words from the name). It is a real
file — the /development-steps page reads and writes it. Full format and field
reference: `docs/development-steps.md`.

```markdown
# <NN> — <name>

> Development step · importance: optional | mandatory | critical

<description — the task, constraints, out-of-scope. Write it yourself or let the
chat / MCP draft it.>

## To-do
- <sub-task an agent picks up>
- <sub-task>

<!-- fractera:step
{"number":<N>,"name":"<name>","importance":"mandatory","status":"new","completedAt":null,"description":"<...>","tasks":[{"id":"<uuid>","body":"<sub-task>"}]}
-->
```

The hidden `fractera:step` block is the source of truth for the structured fields;
the markdown above it is what an agent reads. Keep them in sync (the page does this
automatically when you edit through it).

**To complete a step:** move the file to `DEVELOPMENT-STEPS/COMPLETED-STEPS/`, set
`"status":"completed"` and `"completedAt":"YYYY-MM-DD"` in the block. It then shows
under **Completed steps** (read-only). Ingest the finished step into Brain (§8).

<!-- END PERMANENT -->
