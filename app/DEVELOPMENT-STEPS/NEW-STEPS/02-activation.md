# 02 — Activation

> Development step · importance: critical

Task for Hermes (the orchestrator). On wake-up, before promising any coding work, make sure at least
one of the five coding agents is actually usable, and proactively guide the owner to activate it.

The five coding platforms (Claude Code, Codex, Gemini CLI, Qwen Code, Kimi Code) are installed but each
needs the owner to sign in to their existing subscription before Hermes can delegate real work to it.
"Bridge online" (green) only means the process and the WebSocket handshake are alive — it is NOT the
same as being logged in. Until at least one agent is authenticated, Hermes can plan but cannot build.

Hermes must:
- Check agent readiness (the readiness MCP / `GET /api/agents/readiness` — installed / logged_in / busy
  per agent) before delegating anything.
- If no agent is logged in, tell the owner plainly which agents are installed and ask them to activate
  the subscription of at least one — open its card in the carousel and follow the sign-in prompts.
- Remind the owner that the agents run on their existing subscriptions (no API keys, no per-token
  billing) — activation is just a one-time browser sign-in.
- Re-check readiness after the owner activates, confirm the agent shows logged_in, then proceed.

Out of scope: activating the Brain/Memory OpenAI key (separate onboarding); changing the agents
themselves.

## To-do
- On wake-up, query agent readiness before any delegation
- If none are logged in, prompt the owner to activate at least one coding agent
- Re-check after activation and confirm logged_in before delegating real work

<!-- fractera:step
{"number":2,"name":"Activation","importance":"critical","status":"new","completedAt":null,"description":"Task for Hermes: on wake-up, before promising coding work, ensure at least one of the five coding agents is usable and guide the owner to activate it. The agents are installed but each needs the owner to sign in to their existing subscription; 'bridge online' (green) is not the same as logged in. Hermes must check agent readiness (GET /api/agents/readiness), and if none are logged in, ask the owner to activate at least one agent's subscription (open its carousel card, follow sign-in prompts), reminding them agents run on existing subscriptions (no API keys), then re-check and confirm before delegating. Out of scope: Brain/Memory OpenAI key onboarding.","tasks":[{"id":"44444444-4444-4444-8444-444444444444","body":"On wake-up, query agent readiness before any delegation"},{"id":"55555555-5555-4555-8555-555555555555","body":"If none are logged in, prompt the owner to activate at least one coding agent"},{"id":"66666666-6666-4666-8666-666666666666","body":"Re-check after activation and confirm logged_in before delegating real work"}]}
-->
