# choose-agent

Skill for picking WHICH coding agent to delegate a task to. The readiness MCP
(`check_agents_readiness`) gives you the facts; this skill is the judgement. Keep
the two separate: facts live in the MCP, the choice lives here, so the policy can
change without touching the MCP.

## Always check before delegating

Before every new delegation, call **`check_agents_readiness`** once. It returns a
snapshot of all 5 coding agents in one shot:

```
agents: [{ platform, installed, logged_in, busy,
           last_worked_at, last_worked_page, last_worked_step }, ...]
```

Do not delegate blind. "Bridge online" does NOT mean the agent is usable — an
agent can be alive but logged out, and the task would go into the void.

## How to read the snapshot

- **`logged_in: false`** → the agent cannot run. Do not send it work. Tell the
  owner it needs to sign in (subscription login), or pick another agent.
- **`installed: false`** → the CLI is not on this server. Skip it.
- **`busy: true`** → a task is already running on that agent. Either wait, or
  pick a free agent for an independent task.
- **`busy: null`** → readiness could not read the agent's status; treat as unknown,
  prefer an agent whose status you do know.

## Prefer a "warm" agent

If an agent's `last_worked_page` / `last_worked_step` matches the task you are
about to delegate and `last_worked_at` is recent (minutes, not hours), that agent
most likely still has the relevant context cached. Continuing the work there gives
the best result for the fewest tokens — prefer it, unless it is logged out or busy.

For a task UNRELATED to what an agent just did, do not reuse its warm session for
the sake of it — a stale session can carry over the wrong context. Start fresh
(or pick a different agent) when the new task is a clean break.

## Order of decision

1. Drop agents with `logged_in: false` or `installed: false`.
2. Among the rest, if one is warm for THIS task (matching recent page/step) and not
   busy → choose it.
3. Otherwise choose a free (`busy: false`), logged-in agent that fits the task.
4. If everything fit is busy → wait or queue; do not force a blind delegate.

## Not yet in the snapshot

Context-window % (how full an agent's context already is) is **not** reported in
v1 — CLIs don't expose it consistently. When it lands, fold it in here: a nearly
full context (e.g. 85%) means a large task will degrade — reset the session first
or route the big task elsewhere. Until then, decide on login + busy + warmth.
