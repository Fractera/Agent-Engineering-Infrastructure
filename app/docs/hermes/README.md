# Hermes Orchestration Layer

Hermes is the AI orchestration agent running as a PM2 service on the Fractera server.
It coordinates multi-step tasks across the five AI coding platforms and maintains its own
closed memory of architectural decisions and feedback history.

## Architecture

```
User (architect)
    │
    │  task → Hermes Agent (port 9119)
    │
    ├─ delegate_to_platform(claude-code, prompt) → MCP :3210 → Claude Code PTY
    ├─ delegate_to_platform(codex, prompt)       → MCP :3211 → Codex PTY
    ├─ delegate_to_platform(gemini-cli, prompt)  → MCP :3212 → Gemini CLI PTY
    ├─ delegate_to_platform(qwen-code, prompt)   → MCP :3213 → Qwen Code PTY
    └─ delegate_to_platform(kimi-code, prompt)   → MCP :3214 → Kimi Code PTY
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| Hermes dashboard | 9119 | Web UI — Chat, Jobs, Sessions, Config |
| Claude MCP | 3210 | MCP server for Claude Code bridge |
| Codex MCP | 3211 | MCP server for Codex bridge |
| Gemini MCP | 3212 | MCP server for Gemini CLI bridge |
| Qwen MCP | 3213 | MCP server for Qwen Code bridge |
| Kimi MCP | 3214 | MCP server for Kimi Code bridge |

## Access

Hermes dashboard: `https://hermes.SUBDOMAIN.fractera.ai`
Open via: Fractera Admin → **Hermes** button (header, left of Company Brain)

## Memory & Brain integration

- **Conversation memory:** each Hermes turn is ingested into Company Brain via the
  `lightrag-memory` plugin (`POST /documents/text` with `X-Agent-Identity: hermes`)
- **Knowledge retrieval:** before each LLM call, Hermes queries Brain via hybrid search
  (`prefetch` returns a `<brain_context>` block injected into the user message)
- **Closed zone:** `docs/hermes/` — only Hermes writes here; other agents read-only

## Feedback loop

After Hermes completes a task, the user submits feedback via `HermesFeedbackModal`:
- Verdict: Approved / Partial / Rework / Milestone done / Continue
- Feedback is written to `docs/hermes/feedback-history/{date}-{task_id}.md`
- Auto-ingested into Company Brain
- Forwarded to Hermes at `POST :9119/api/feedback`

## Skills

Hermes has the `delegate-task` skill at `~/.hermes/skills/delegate-task.md`.
Load it via `skill_view("delegate-task")` to get platform selection guidance.

## Configuration

Config lives at `/root/.hermes/config.yaml` on the server:
- LLM: OpenRouter primary (deepseek-r1:free), OpenAI gpt-4o-mini fallback
- Memory provider: `lightrag-memory` (this project)
- MCP servers: five platform bridges (ports 3210–3214)
- Plugin: `fractera-platforms` (delegate_to_platform, delegate_to_best tools)

## ⛔ DO NOT MODIFY

Files in `docs/hermes/` are Hermes's private memory. Do not create, edit, or delete
anything here. Hermes manages this directory autonomously.
