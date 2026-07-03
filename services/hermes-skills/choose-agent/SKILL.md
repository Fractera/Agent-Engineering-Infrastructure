---
name: choose-agent
description: >
  Pick WHICH of the 5 coding agents (claude-code/codex/gemini-cli/qwen-code/kimi-code)
  to delegate a task to. Use before every delegation: call the readiness MCP for the
  facts (installed/logged_in/busy/warmth), then apply the judgement here. Use when you
  are about to hand coding work to an agent and must choose the right one.
version: 1.0.0
metadata:
  hermes:
    tags: [orchestration, delegation, agent-selection, readiness, choose, routing]
    related_skills: [delegate-task, record-deployment]
---

# choose-agent

Skill for picking WHICH coding agent to delegate a task to. The readiness MCP
(`owner_coding_agents_check_readiness`) gives you the facts; this skill is the judgement. Keep
the two separate: facts live in the MCP, the choice lives here, so the policy can
change without touching the MCP.

## Always check before delegating

Before every new delegation, call **`owner_coding_agents_check_readiness`** once. It returns a
snapshot of all 5 coding agents in one shot:

```
agents: [{ platform, installed, logged_in, busy,
           last_worked_at, last_worked_page, last_worked_step }, ...]
```

Do not delegate blind. "Bridge online" does NOT mean the agent is usable — an
agent can be alive but logged out, and the task would go into the void.

## Confirm what you hand off — BEFORE you dispatch (mandatory)

Delegating is a state change (a task starts running on a real agent), so it obeys
`confirm-before-mutation`. Before you call `owner_delegate_task_to_platform`, restate
to the owner EXACTLY what you are about to hand off and wait for an explicit go:

> Правильно ли я вас понимаю, что вы хотите, чтобы я передал агенту кодирования:
> - задача: <одна-две строки — что именно должен сделать кодер>
> - агент-получатель: <claude-code | codex | …>
> - что он получит на вход: <страница/шаг/требования>
>
> Подтвердите — и я передаю.

Never dispatch silently. The owner must see the exact payload and the target agent
before any coder starts work.

## The two facts to report — "present" vs "signed into subscription"

The snapshot carries the two numbers the owner cares about; name BOTH, do not collapse them:

- **present / active** = `installed: true` — the coding agent exists on this server (its CLI is here).
- **signed into subscription** = `installed && logged_in` — it is actually logged into its paid
  subscription and can run. A present-but-logged-out agent CANNOT take work.

So when you talk about readiness, say it as two counts: "checked N; present: X; of those signed
into an active subscription: Y". Y is the number that can actually run right now.

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
5. If NONE is signed into a subscription (`Y == 0`) → you cannot delegate. Go to the calm
   report below — this is NOT a failure, the agents are simply not connected.

## When nothing can run — report calmly, NEVER "broken" (critical)

If no coding agent is signed in (`Y == 0`), the platform is **healthy** — there is simply no
active agent to receive the task. This distinction is the whole point: an inactive agent is an
expected precondition (a fresh server has a green bridge but no logged-in agent), NOT a platform
fault. **Never phrase it as "everything is broken" / "the platform does not work".** That reading
scares the owner into thinking the product failed when nothing failed.

Give a structured status instead, in the owner's language, with these exact slots:

> Я попытался передать задачу агенту кодирования: <что именно>.
> Проверил готовность агентов: <перечисли, кого проверил>.
> Обнаружил: присутствуют/активны — X, из них с активной подпиской — Y.
> Сейчас ни один агент кодирования не подключён к подписке — это НЕ сбой платформы,
> агенты просто не активированы. Что можно сделать:
> 1. активируйте нужных агентов (вход в подписку) и повторите запрос;
> 2. либо я сохраню эту задачу в development steps (шаг №N), и вы вернётесь к её
>    выполнению в любое удобное время.

Option 2 is the `owner_report_blocker_step` fallback (see SOUL "edge of tools"): you record the
task as a numbered development step and give the owner its number. Do not pick for them — offer
both and let the owner choose.

## Not yet in the snapshot

Context-window % (how full an agent's context already is) is **not** reported in
v1 — CLIs don't expose it consistently. When it lands, fold it in here: a nearly
full context (e.g. 85%) means a large task will degrade — reset the session first
or route the big task elsewhere. Until then, decide on login + busy + warmth.
