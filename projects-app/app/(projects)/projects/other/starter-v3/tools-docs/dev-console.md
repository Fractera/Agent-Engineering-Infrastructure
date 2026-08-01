# Tool: dev-console — the terminal you run inside (not an embeddable widget)

Short by design: this is **not** a UI primitive you wire into a component. It is the modal terminal that
**runs a coding agent** (Claude Code / Codex) against this automation's folder — the console you, the agent,
work *inside*. Listed here only so it is not mistaken for something to embed.

- **Where:** `_shared-v2/tools/dev-console/`. Mounted by the platform (the dev-console launcher opens it over
  a WebSocket to the PTY bridge), never by an automation's component.
- **You call nothing.** There is no prop, no import, no wiring on your side. Do not build a terminal, a PTY
  client, or a console into a product surface.
