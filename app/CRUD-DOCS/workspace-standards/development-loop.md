# The Fractera Development Loop — standard

> The diagram for this document is **`./Fractera-Development-Loop.jpg`** (in this folder). It shows the whole
> cycle on one canvas; this text narrates it. This is a fundamental orientation doc — read it to understand the
> *nature* of the application: how one request becomes tested, deployed, recorded software, and who does what.

This is the cycle the whole workspace exists to run. A single **admin request** enters at the bottom and comes
out the top as a running, secure web app — with no human writing the code. **Hermes** orchestrates, a **coding
agent** does the work, and **LightRAG** (Company Memory) grounds every step. The loop never just runs once: each
pass writes back to memory and to the recorded history, so the next request starts smarter than the last.

## The loop, stage by stage (bottom → top of the diagram)

1. **A request comes in.** A **new admin request** arrives in natural language — through the Hermes chat Web UI
   or Telegram. The admin describes an outcome; they do not write code.
2. **Hermes gets its bearings.** Hermes (the orchestrator / brain) loads *who it is* and *where it is*: its
   identity file `SOUL.md`, the AI core catalogue, and the current project's context files (`CLAUDE.md` /
   `AGENTS.md`). It asks which project is active and pulls that project's state. All recalled from **LightRAG**,
   so it starts already knowing the codebase.
3. **Hermes picks the worker.** Hermes is deliberately light — it does not write the hard code. It checks
   **which coding agents are ready** (installed and signed in) and chooses the best fit (e.g. Codex for fast
   iteration, Claude Code for careful multi-file work).
4. **The chosen agent is enriched.** Before working, the agent reads its own instruction file (`AGENTS.md` /
   `CLAUDE.md`), the shared `GLOSSARY.md` (so it uses the project's terms), and the **completed development
   steps** (the history of what was already built and why) — again pulled from LightRAG.
5. **Generate a task, then the code.** The agent turns the request into a concrete **task** (the admin can
   optionally steer it), then **generates the code** in the open `app/` layer. The result **renders step by
   step** so the admin watches it take shape.
6. **Test, deploy, branch on the result.** The change is built and deployed, then the loop branches:
   - **Error** → the failure feeds back: the agent gets a new task informed by what went wrong and tries again.
     The loop self-corrects.
   - **Success** → the loop records the outcome.
7. **Record and close.** On success the workspace **updates the completed steps** (the `/development-steps`
   log) and **updates the deployments tab** (the Product Loop journal — which agent, model, tokens, rating).
   Everything learned is pushed back into LightRAG.
8. **The output is a secure web app** — served over HTTPS on the admin's own domain, or plain HTTP on an IP
   during onboarding.

## The actors and what they read

- **Hermes — the orchestrator** (`fractera-hermes`, `:9119`). The only part that talks to the admin and the
  part that decides what happens next at every turn. Loads `SOUL.md` (identity) + project context, plans,
  chooses, dispatches, records. It delegates the heavy lifting; it does not write the hard code itself.
- **The five coding agents** — Claude Code, Codex, Gemini CLI, Qwen Code, Kimi Code — run preconfigured, each
  behind a bridge exposed to Hermes over MCP (ports `3210–3214`). They run on the admin's existing
  **subscriptions**, not per-token API keys. Hermes checks **readiness** (installed + signed in) before
  delegating and can switch agents mid-task without losing the thread.
- **LightRAG — Company Memory** (`fractera-rag`, `:9621`). The central column on the diagram that every stage
  reads from and writes to. A Knowledge Graph RAG queried by Hermes and all five agents. This shared memory is
  why the loop is token-efficient: instead of re-explaining the codebase each time, every stage recalls exactly
  the relevant context (project state, glossary, completed steps, past decisions).

## The instruction files that steer the loop (real files on disk)

- **`SOUL.md`** — Hermes's identity and operating rules, read at every wake-up.
- **`CLAUDE.md` / `AGENTS.md`** — the project-context files each coding agent reads in the repository (sets how
  it behaves in *this* project).
- **`GLOSSARY.md`** — the workspace term map so every agent reads the project's terms the same way.
- **The completed development steps** (`DEVELOPMENT-STEPS/COMPLETED-STEPS/`) — the log of what was built and
  why, consulted before starting so solved problems are not repeated.

## The record (what closes the loop)

- **Completed development steps** — the driving step is moved into the completed log with its date; a durable
  record read by future agents (the `/development-steps` page).
- **The deployments tab (Product Loop)** — every build is logged with the agent, the model, the real token
  cost, and a quality rating. Over time this becomes a feedback record of which agent and model produce the
  best results for the project, at what cost — something a plain deploy log can never tell you.

Both records are pushed back into LightRAG, so the memory that grounded this request is richer for the next one.

## Why it is a loop, not a pipeline

A pipeline runs once and forgets. This loop **compounds**: memory grows (each request writes its decisions,
code and outcomes back into LightRAG), history accumulates (completed steps + deployments record how the
project was made and which agents work best), and it is all **yours and open-source** — every file readable,
every decision verifiable, on your own VPS, with no cloud lock-in.

---

*Source of truth for this content: the public reference page `https://www.fractera.ai/ai-development-loop`
(and the MCP tool `get_ai_development_loop_info`). This in-repo copy ships with every workspace so any agent
analyzing the project can understand its nature directly from the codebase.*
