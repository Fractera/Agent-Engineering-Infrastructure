---
name: propose-new-agent-skill-or-mcp
description: >
  Propose a new agent skill or MCP connector for any of the 6 agents by creating a draft
  record on /ai-draft-settings. Use when you spot an automation opportunity, a repeating
  pattern worth capturing, or the architect says "document this as a skill / add this to
  the agents". You do NOT build the real file — the draft is the proposal the architect
  approves and materializes. Calls owner_draft_create_record (dry_run first, §8.2 confirm).
version: 1.0.0
metadata:
  hermes:
    tags: [ai-draft-settings, propose, skill, mcp, draft, automation, capability]
---

# propose-new-agent-skill-or-mcp

Use this skill when you notice an automation opportunity, a repeating pattern, or
want to propose a new skill / MCP connector for any of the 6 agents (including
yourself). The draft lands on `/ai-draft-settings` for the architect to review —
you do not build the real file, you only propose it.

## FIRST — is it already YOUR native tool? (do not propose reinventing it)

Before proposing a new skill/MCP whose domain overlaps your own native arsenal — web search/extract, a
browser, image generation, TTS, memory, scheduling/cronjob, delegation — check whether you ALREADY have that
native tool (you ship ~70, plus the Nous Tool Gateway). If so, do NOT propose building it from scratch: enable
it in your config and use it. A coding agent may not know your native tools and could ask you to "create a
skill for web search" — recognize that as your native `web_search` and say so, instead of drafting a new
capability. Propose a new one only when it is genuinely new and NOT covered natively (step 192).

## When to use

- You spot something being done manually that an agent skill could automate **and no native tool covers it**.
- A coding agent asks you to "create a skill / MCP for X" **that is not already your native tool**.
- You finish a session and notice a reusable pattern worth capturing (not already native).
- The architect says "document this as a skill" or "add this to the agents".

## Mandatory §8.2 confirm flow (dry_run first)

ALWAYS call `owner_draft_create_record` **twice**:

**Step 1 — preview (dry_run=true):**
```json
{
  "agent": "<target agent>",
  "kind": "skill",
  "name": "<short title>",
  "description": "<what it should do>",
  "dry_run": true
}
```
Show the architect the `generatedSource` and `generatedTasks` from the response.

**Step 2 — confirm from the architect.** State the intent:
> Правильно ли я вас понимаю, что вы хотите:
> — создать черновик навыка «<name>» для <agent>
> — source и tasks см. выше
> Подтвердите — и я опубликую черновик.

**Step 3 — create (no dry_run):**
```json
{
  "agent": "<target agent>",
  "kind": "skill",
  "name": "<short title>",
  "description": "<same description>"
}
```

## After creating

Tell the architect:
> Черновик «<name>» опубликован на /ai-draft-settings → <agent> → Skills.
> Когда вы будете готовы — откройте страницу, уточните source и tasks и материализуйте навык.

Do NOT build the real skill file yourself — the draft is the proposal; the
architect approves and materializes it in a separate development step.

## When the draft IS materialized — canonical form (do not flatten)

When the approved draft becomes the **real** record, it MUST take the one canonical form per agent or it
silently fails to load. A **skill** is a directory `<name>/SKILL.md` with YAML frontmatter (`name:` +
trigger-rich `description:`) — **never a bare flat `<name>.md`**. This matters most for YOU: Hermes
discovers skills ONLY as `<name>/SKILL.md` (a flat file is invisible → you pick the wrong skill). MCP =
bridge + registration in every agent's client + MCP-REGISTRY; instruction = merge into the root file
(SOUL.md/HERMES.md for you). Same canon serves all six agents — full table in the workspace standard
`ai-draft-settings.md` → "Materialization format contract".

## Parameters for `owner_draft_create_record`

| Field | Required | Notes |
|---|---|---|
| `agent` | ✅ | `hermes` / `claude-code` / `codex` / `gemini-cli` / `qwen-code` / `kimi-code` |
| `kind` | ✅ | `"skill"` or `"mcp"` |
| `name` | ✅ | Short title, ≤50 chars |
| `description` | ✅ | What the skill/connector does — drives source generation |
| `tier` | — | MCP only: `public` / `user` / `owner` (default `owner`) |
| `mutating` | — | MCP only: `true` (default) / `false` |
| `mode` | — | `supplement` (default) / `replace` |
| `dry_run` | — | `true` = preview only |
