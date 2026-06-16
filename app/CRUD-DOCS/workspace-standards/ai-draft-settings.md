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
- `tier` — **MCP only**: access tier `public` | `user` | `owner` — *who may call the tool* (MCP-REGISTRY §8.3).
  Defaults to `owner` (strictest — unknown is locked to the owner). This is the **source of truth** for the
  future manifest row and for the leading word of the tool name (§8.1): `public`/`user`/`owner` is the first
  significant word (third for slot tools). Skills/instructions ignore it.
- `mutating` — **MCP only**: `true` = the tool writes state → the agent embeds the §8.2 *confirm-before-mutation*
  protocol in its description and sets `"mutating":true` in the manifest; `false` = read-only. Defaults to `true`.
- `name` — short title.
- `tasks` — the wishes (`kind:"todo"`) and deletion requests (`kind:"delete"` with `outcome`).

### MCP access — the tier is the decision that makes a draft useful
For an MCP draft the page captures the three things the future `bridges/platforms/mcp-access-manifest.json` row
needs — `tier`, `mutating`, and `first_party` (always `true` for our drafts) — plus a derived **channel**
(`public`/`user` → `public-consultant`; `owner` → `owner-hermes`, §8.3 п.1 / §8.4). The form previews the §8.1
tool-name skeleton (`<tier>_<area>_<action>_<object>`, snake_case). The page never edits the manifest itself —
it only carries the decision as guidance; the agent that builds the real tool writes the manifest and config.

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
4. For an **MCP** draft: name the tool per §8.1 using its `tier` as the leading word, add its row to
   `bridges/platforms/mcp-access-manifest.json` (`tier` / `mutating` / `first_party:true`), and register it in
   the channel toolset implied by the tier (§8.3 п.1). A `mutating` tool also carries the §8.2 confirm protocol.
5. The real files (`CLAUDE.md`, `~/.hermes/SOUL.md`, the skills dir, `config.yaml` MCP, the manifest, …) are
   the targets — **only the agent writes them**, never this page.

## Capability declarations — REQUIRED for the consultant to serve anything

Beyond per-agent instruction/skill/MCP drafts, this page is also where the architect curates
the **consultant capability declarations** — the map of what THIS project can do, split by
access tier. They are a hard requirement, not optional:

- **Two documents** under `AGENT-CAPABILITIES/`: `public.md` (public-tier capabilities) and
  `authenticated.md` (signed-in **user** capabilities + **owner/admin** capabilities, marked
  per tier). Each entry: `capability · tier · what happens · tool/action · sign-in`.
- These are **part of the consultant agent's identity** — their content is loaded into the
  public agent's SOUL by default on every turn (see `interactive-consultant-architecture.md`
  §8a, MCP-REGISTRY §8.8).
- **INVARIANT: without these documents the agent must not serve data or invent capabilities.**
  An undeclared request → "the site doesn't offer that"; a user/owner request → offer sign-in.
- **They grow with the project:** every time a new MCP tool or skill is added, its capability
  is appended here with its tier (public / user / owner) — and mirrored on the public
  documentation page so users can discover it. Dozens of public, hundreds of user, thousands of
  owner capabilities are all expected; the structure must scale (tiered tables/sections).
- The architect edits them here (free-form, like any draft); an agent applies them to the real
  `AGENT-CAPABILITIES/*.md` files, which regenerates the consultant SOUL.

Static page — no live polling; it loads on open and refetches after each edit.
