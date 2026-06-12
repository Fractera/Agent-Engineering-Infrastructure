# AI Draft Settings — file format & contract

The **AI Draft Settings** page (`/ai-draft-settings`) is a filesystem-backed staging layer,
the same model as `/architecture` (step 108), `/development-steps` (step 109) and `/patterns`
(step 110): **real markdown files are the single source of truth — there is no database.**

It is the intermediate layer between the architect and the files that drive the six agents.
You write **free-form wishes** here — to **supplement** or **replace** an agent's real
instruction / skill / MCP file — **without editing the real file**. An agent later reads a
draft and applies it to the original. The originals are **never written from this page**; this
is a mirror you work on.

## Layout

Files live under `AI-DRAFT-SETTINGS/` at the project root, one folder per agent (fixed order):

```
AI-DRAFT-SETTINGS/
  HERMES/        SOUL.md  HERMES.md   SKILLS/<NN>-<slug>.md   MCP/<NN>-<slug>.md
  CLAUDE-CODE/   CLAUDE.md            SKILLS/                 MCP/
  CODEX/         AGENTS.md            SKILLS/                 MCP/
  GEMINI-CLI/    GEMINI.md            SKILLS/                 MCP/
  QWEN-CODE/     QWEN.md              SKILLS/                 MCP/
  KIMI-CODE/     KIMI.md              SKILLS/                 MCP/
```

The skeleton (six folders, each with its seeded instruction doc(s) + empty `SKILLS/`/`MCP/`)
is created automatically by the page (`ensureSkeleton`). The instruction file name matches the
agent's real one; Hermes has two (`SOUL.md` = identity, `HERMES.md` = project rules).

The left tree mirrors the agent's **real** skills and MCP servers (from the `/ai-core`
catalogue) as **read-only reference** (dimmed, tagged `real`). Selecting one lets you start a
draft over it. New, requested records that have no original behind them show **amber with a
`(req)` badge**.

## A draft file

Each `.md` is one draft. The hidden machine block `<!-- fractera:draft … -->` is the source of
truth for the structured fields; the markdown above it is what an agent reads.

```markdown
# summarize-pr

> Draft · Skill · new skill

Free-form wishes for this agent record. An agent reads them and applies the change to the real
file — this draft is a mirror, the original is never edited here.

## Wishes
- Summarize the diff in 5 bullet points, flag risky changes.

<!-- fractera:draft
{"agent":"claude-code","kind":"skill","mode":"supplement","target":null,"name":"summarize-pr","tasks":[{"id":"…","body":"…","kind":"todo"}]}
-->
```

### Fields
- `agent` — agent id (`hermes`, `claude-code`, `codex`, `gemini-cli`, `qwen-code`, `kimi-code`).
- `kind` — `instruction` | `skill` | `mcp`.
- `mode` — `supplement` | `replace` (how the agent applies the wish — the switch at the top).
- `target` — the real original this draft refers to, or `null` for a brand-new record.
- `name` — short title.
- `tasks` — the wishes (`kind:"todo"`) and deletion requests (`kind:"delete"` with `outcome`).

### Colour rules (same as `/architecture`)
- `target === null` → **declared** → **amber name + `(req)`** (a new record, no original).
- `target` set, or any open task → **`(req)` badge only**, name stays black (an overlay / a
  seeded instruction doc with wishes).
- A real original with no draft → black, dimmed, read-only reference.

## Danger zone (faithful to `/architecture`)
- **Order deletion** — a `kind:"delete"` task: ask an agent to **retire the real original** and
  refactor anywhere it is used. Reason + expected outcome.
- **Discard all changes** — clear every wish; drops the `(req)` badge. The real file is untouched.
- **Remove draft** — hard-delete only the **mirror** file. The real original is never affected;
  a seeded instruction doc just resets empty on next load.

## How an agent applies a draft
1. Read the draft (`AI-DRAFT-SETTINGS/<AGENT>/…`), its `mode` and `tasks`.
2. For `supplement`, merge the wishes into the real file; for `replace`, rewrite it.
3. For a `kind:"delete"` task, retire the real original and refactor its uses.
4. The real files (`CLAUDE.md`, `~/.hermes/SOUL.md`, the skills dir, `config.yaml` MCP, …) are
   the targets — **only the agent writes them**, never this page.

Static page — no live polling; it loads on open and refetches after each edit.
