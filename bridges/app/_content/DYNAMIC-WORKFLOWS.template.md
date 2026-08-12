# DYNAMIC-WORKFLOWS.md — the biggest thing this project can switch on, and the one that can cost the most

**This document is OFF by default, and that is the correct state for most projects.**

It describes *dynamic workflows* — the capability that lets one request orchestrate waves of agents
instead of one. It is the counterpart of `SINGLE-AGENT.md`: that document locks multi-agent work, this
one is the only sanctioned door out, and the door has two locks on it for good reasons.

## What it actually is

Not "many agents at once". That is a fan-out, and a fan-out is what people build by hand when they are
guessing.

A dynamic workflow is **a script that Claude writes and a runtime executes**. The script holds the loop,
the branching and the intermediate results, so a first wave runs, its results decide what the second wave
is — verification, summary, another fan-out — and only the final answer reaches the conversation. Boris
Cherny, who built Claude Code, calls this *"an algebra for agents"*.

Trigger it by saying **"use a workflow"**, or with the keyword `ultracode` in your prompt. `/workflows`
shows a live view of every phase, its agent count and its token total, and lets you pause or stop.

## 🔒 Where it actually runs — read this before anything else

**Nothing is created on your production server, and no virtual machine is started anywhere.**

The runtime executes the *script* in an isolated environment, separate from the conversation — isolated
means it has **no filesystem or shell access of its own**. The script only coordinates. The agents it
spawns run **inside your existing Claude Code session, on the machine where that session is running**,
with the same permission mode, the same tool allowlist and the same sandboxing as any other tool call you
already make. Your operating system does not matter to this; no separate runtime is installed.

So the practical answer to "what will it touch?" is: **exactly what your session can already touch, only
by up to sixteen agents at once instead of one.** If your session can reach a production server, so can
they — not because a workflow is special, but because your session already could.

Two consequences worth knowing before the first run:

- **Subagents always run in `acceptEdits` mode**, whatever your session's mode is. File edits are
  auto-approved. Shell commands, web fetches and MCP tools outside your allowlist still prompt you.
- **There is no mid-run input.** Only a permission prompt can pause a run. If you want sign-off between
  stages, make each stage its own workflow.

The example he gives is the honest measure of the ceiling. The Bun team rewrote their JavaScript runtime
from Zig to Rust as a single task:

> "It ran for 11 days and it rewrote the entire code base."
> — Boris Cherny, [YC Root Access](https://www.ycrootaccess.com/p/boris-cherny-building-claude-code)

Over 100,000 lines, now in production, from work that would have taken a team a year. Further reading:
[Lenny's Newsletter — what happens after coding is solved](https://www.lennysnewsletter.com/p/head-of-claude-code-what-happens)
· [WorkOS — key takeaways](https://workos.com/blog/boris-cherny-claude-code-acquired-interview-takeaways).

## Why it could be the best thing in this project

Because this project has exactly the shape workflows are good at: **many independent units, each of which
a machine can check.**

A catalogue of translated interface strings. A corpus of content pages across languages. A sweep that
brings every route to one standard. In work like that a wave of agents is not a gamble — each unit either
passes its guard or it does not, and the orchestrator sees which.

The guards already exist here: `npm run check:i18n` counts languages and keys, `npm run check:content`
refuses a bad link, `npm run check:encoding` finds a broken character in any language. **A workflow is
only as safe as the guard that judges its output.**

## Why it can cost more than everything you have done so far

An agent that runs for eleven days is not free, and neither is one that runs for eleven minutes across
forty parallel branches. Every agent carries its own context and pays for it separately, and runs count
against your plan's limits like any other session.

**Availability is not the question — affordability is.** Workflows are available on every paid plan (on
Pro you switch them on in the `Dynamic workflows` row of `/config`), so nothing stops you from starting
one. What stops you is the limit you hit halfway through. **The honest test is your own last week:**

- If an **ordinary single-agent session** already reaches your limit before the work is done, a workflow
  will not fit. It will stop in the middle — and see the resume rule below for why that is expensive.
- If you comfortably finish ordinary sessions without thinking about the limit, a workflow is affordable.

Plans and their numbers change often enough that a figure written here would be wrong within months; the
test above stays true. What the product gives you instead of a promise:

- **`/workflows` shows each agent's token use while the run goes**, and lets you stop it there.
- **A `Large workflow` warning** appears when a run schedules more than 25 agents or its projected total
  passes 1.5 million tokens. It is advisory — it does not pause anything.
- **A size guideline** in `/config` tells Claude how many agents to aim for: `small` under 5, `medium`
  under 15 (the default), `large` under 50. Hard caps sit behind it: 16 agents at once, 1,000 per run.
- **Price a big job by running a small slice first** — one directory instead of the whole repository.

**Stopping mid-run costs more than it looks.** On resume, cached results stop at the first agent that
had not finished, and every agent that started after it runs again — even the ones that completed. And a
run does not survive leaving Claude Code: the next session starts it fresh. This is why a workflow made of
many small agents preserves far more progress than one made of a few long ones.

## The failure mode you must understand before switching this on

**An agent that dies mid-write leaves a file that does not compile.**

This is not theoretical. It has already happened in this product: five agents were translating one
dictionary each, the session hit its limit, two of them died while writing, and they left placeholder
markers (`__UK_BLOCK__`) inside an object literal. The file looked finished. It could never have built.
Nobody noticed until a build was actually run, because a dictionary check validates dictionaries, not the
code that uses them.

Multiply that by a workflow's fan-out and you have the real risk: **not a wrong answer, but a plausible
one at scale.** This is why the guard rule below is a rule and not advice.

## 🔒 The guard rule

> **A workflow is justified only where each unit's result is checked by a machine without you.**

Translations, content sweeps, mechanical migrations — yes, guards exist. Architecture decisions, the
client/server boundary, debugging a build — no. There, proving the answer costs more than producing it,
and more agents produce more work to review, not less.

## 🔒 Two locks on the door

**First: confirmed user cases.** The panel refuses to switch this on until `USE-CASES/CASES/` holds cases
the owner has confirmed. The reason is not bureaucracy. A workflow is an amplifier, and an amplifier
pointed at a guess produces a large, tidy, expensive wrong thing. The most costly outcome available in
this product is a hundred agents building carefully in the wrong direction. Cases are what point it.

**Second: your own judgement about cost**, using the test above. The panel cannot check your plan; only
you can.

## Once it is on

- Say **"use a workflow"** on the task itself. Nothing about a task authorises one by itself — not its
  size, not "independent parts", not "faster in parallel". That sentence stays true from `SINGLE-AGENT.md`.
- **Name the guard before the wave.** If you cannot say which command judges the output, you do not have
  a workflow — you have a fan-out with a hope attached.
- **You approve the plan before it runs.** The prompt lists the planned phases; `View raw script` shows
  the script itself. Read the phases. This is the last cheap moment to notice the wrong direction.
- **Your session stays free while it runs** — the work is in the background, and `/workflows` is where you
  watch it. But you cannot steer mid-run: there is no input into a running workflow. If a stage needs your
  sign-off, make it its own workflow.
- **Save what worked.** In `/workflows`, `s` saves the run's script as a command, in the project or for
  yourself. A review you run on every branch then runs the same orchestration each time — that, not the
  size of one run, is where workflows repay the setup.

## When to switch it back off

After the campaign that justified it. This is not a setting to leave on: with it on, every large request
carries the question "should this fan out?", and for most work here the answer is no — one mind holding
the whole picture, and one build to prove it.
