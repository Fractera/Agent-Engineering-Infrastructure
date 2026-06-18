---
name: create-draft
description: >
  Propose a new agent skill or MCP connector by creating a structured draft record
  on /ai-draft-settings. Use when you notice an automation opportunity, a repeating
  pattern worth capturing, or when the architect asks to "document this as a skill".
  Do NOT build the real file â€” the draft is the proposal; the architect approves it.
---

# create-draft

Propose a new agent skill or MCP connector for any of the 6 agents
(claude-code, codex, gemini-cli, qwen-code, kimi-code, hermes). The draft lands
on `/ai-draft-settings` for the architect to review. You do not build the real
file â€” you propose it.

## When to use

- You spot a repeating manual pattern an agent skill could automate.
- The architect says "document this as a skill" or "add this MCP connector".
- You finish a task and notice a reusable pattern worth capturing.

## Mandatory Â§8.2 confirm flow (always two calls)

**Step 1 â€” preview (dry_run=true), then show the architect:**
```json
{
  "agent": "<which agent>",
  "kind": "skill",
  "name": "<title>",
  "description": "<what it should do>",
  "dry_run": true
}
```

State the intent to the user, show `generatedSource` and `generatedTasks`, wait for
explicit confirmation.

**Step 2 â€” create (after confirmation):**
```json
{
  "agent": "<which agent>",
  "kind": "skill",
  "name": "<title>",
  "description": "<same description>"
}
```

## For MCP connectors (kind="mcp")

Add these fields:
- `tier`: `"public"` | `"user"` | `"owner"` (default `"owner"`) â€” who may call the tool (Â§8.3)
- `mutating`: `true` (default) / `false` â€” whether it writes state

## After creating

Report to the architect:
> Draft Â«<name>Â» published to /ai-draft-settings â†’ <agent> â†’ Skills (or MCP).
> Open the page when ready, review source and tasks, and materialise the record.

## Tool reference

MCP tool: `owner_draft_create_record` on `ai-draft-bridge` (:3221)

| Field | Required | Notes |
|---|---|---|
| `agent` | âœ… | `hermes` / `claude-code` / `codex` / `gemini-cli` / `qwen-code` / `kimi-code` |
| `kind` | âœ… | `"skill"` or `"mcp"` |
| `name` | âœ… | Short title â‰¤50 chars |
| `description` | âœ… | What it should do â€” drives source + task generation |
| `tier` | â€” | MCP only, default `"owner"` |
| `mutating` | â€” | MCP only, default `true` |
| `mode` | â€” | `"supplement"` (default) / `"replace"` |
| `dry_run` | â€” | `true` = preview only, nothing created |

