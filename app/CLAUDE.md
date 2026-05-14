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
2. **Read history**: `NEXT_STEP.md`, `old-steps-map.md`, related entries in `old-steps/` and `reports/`
3. **Ask clarifying questions** (§2) until the user says go
4. **Write `NEXT_STEP.md`** — name, known constraints, subtasks, out-of-scope
5. **Query Company Brain** (§7) if in production mode
6. **Write code** with code discipline (§10)
7. **Produce 2 independent proofs** (§5) — non-negotiable
8. **Ask the user for deploy permission** (§5)
9. **On user's "yes" → deploy** (§11) and verify the live URL
10. **Feed Company Brain** (§8) — push reports/docs back to Brain
11. **Archive the step** — rename `NEXT_STEP.md` → `old-steps/N--{slug}.md` where `slug` is a 6–12 word kebab-case description derived from the task title. Add a line to `old-steps-map.md` linking to the new file.

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
- Create a sub-task in `NEXT_STEP.md`
- Continue without rationalizing the failure

---

## 6. Journal system — long-term memory

The repository is your memory across sessions. Six locations:

| Path | Purpose |
|---|---|
| `NEXT_STEP.md` | Current task — stable pointer, single filename. Inside, the first line is the full descriptive title |
| `old-steps/N--{slug}.md` | Snapshot of every completed task. `slug` = 6–12 word kebab-case derived from task title. Example: `7--add-paint-calculator-with-walls-history-cost.md` |
| `old-steps-map.md` | One-line index of all completed steps with link to each archive file |
| `docs/` | Long-lived architectural docs (ADRs, glossary, domain notes) |
| `reports/errors/*.md` | Bugs and dead-ends — how they were fixed |
| `reports/patterns/*.md` | Reusable working patterns |
| `glossary.md` | Project-specific terms (helpful for voice input) |

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
- Glossary term added to `glossary.md`
- Completed step archived to `old-steps/N.old-step.md`

**When NOT to push:**
- Small code edits (Brain re-indexes via the full scan periodically)
- WIP drafts of `NEXT_STEP.md`
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

## 9. Built-in platform capabilities

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

## 10. Code discipline

**Hard limit: 200 lines per file, excluding imports/exports.**

A file exceeding 200 lines must be decomposed immediately — split by responsibility, not by line count. Non-negotiable. If you encounter an oversized file in the area you're editing, decompose it before continuing the requested change.

Other rules:
- Edit existing files before creating new ones
- No comments unless the *why* is non-obvious
- No emojis unless the user requests them

---

## 11. Deploy mechanics

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

## 12. Agent identity

Include this header on every API call so DB changes are attributed correctly:

```
-H "X-Agent-Identity: claude"
```

Without it, changes are attributed to a generic agent — auditability is lost.

---

<!-- PERMANENT — do not delete -->

## Template — NEXT_STEP.md structure

When opening a new task, `NEXT_STEP.md` must use this structure:

```markdown
# Current task: [name]

**Started:** YYYY-MM-DD
**Mode:** prod | dev
**Status:** Open

## Known constraints (from history)
- [step N] ...
- [report X] ...

## Subtasks
- [ ] ...
- [ ] ...

## Out of scope
- ...

## Proofs required for "done"
- [ ] Proof 1: ...
- [ ] Proof 2: ...
```

When complete:
1. Derive `slug` from the task title — 6–12 words, kebab-case, lowercase. Example: title *"Add paint calculator with walls, history and cost"* → slug `add-paint-calculator-with-walls-history-cost`
2. Rename and move `NEXT_STEP.md` → `old-steps/N--{slug}.md`
3. Add a line to `old-steps-map.md` in this format:

```
N. YYYY-MM-DD — Short title — one-sentence outcome — [→](old-steps/N--{slug}.md)
```

4. Ingest the archived file into Brain (§8).
5. Reset `NEXT_STEP.md` to an empty stub ready for the next task.

<!-- END PERMANENT -->
