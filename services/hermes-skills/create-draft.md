# create-draft

Use this skill when you notice an automation opportunity, a repeating pattern, or
want to propose a new skill / MCP connector for any of the 6 agents (including
yourself). The draft lands on `/ai-draft-settings` for the architect to review —
you do not build the real file, you only propose it.

## When to use

- You spot something being done manually that an agent skill could automate.
- A coding agent asks you to "create a skill / MCP for X".
- You finish a session and notice a reusable pattern worth capturing.
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
