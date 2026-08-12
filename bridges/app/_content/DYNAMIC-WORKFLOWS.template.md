# DYNAMIC-WORKFLOWS.md — the biggest thing this project can switch on, and the one that can cost the most

**This document is OFF by default, and that is the correct state for most projects.**

It describes *dynamic workflows* — the capability that lets one request orchestrate waves of agents
instead of one. It is the counterpart of `SINGLE-AGENT.md`: that document locks multi-agent work, this
one is the only sanctioned door out, and the door has two locks on it for good reasons.

## What it actually is

Not "many agents at once". That is a fan-out, and a fan-out is what people build by hand when they are
guessing.

A dynamic workflow is **staged orchestration**. Claude runs a first wave, reads what came back, and only
then decides what the second wave is — a verification pass, a summarisation pass, another fan-out, or
nothing at all. Boris Cherny, who built Claude Code, calls this *"an algebra for agents"*: sequential and
parallel become operations you compose, not a setting you choose in advance. It runs inside a sandboxed
virtual machine, and it is triggered by saying, in plain words, **"use a workflow"** — there is no button.

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
forty parallel branches. Every agent carries its own context and pays for it separately.

**The test is not the name of your plan — it is your own last week.** Plans and their limits change often
enough that writing a number here would make this document wrong within months. Use this instead:

- If an **ordinary single-agent session** already reaches your limit before the work is done, a workflow
  will not fit. It will stop in the middle, and a workflow stopped in the middle is worse than one never
  started — see the failure mode below.
- If you comfortably finish ordinary sessions and the limit is something you rarely think about, a
  workflow is affordable. In practice that means one of the **Max** tiers rather than the entry plan.

There is no partial credit here. Half a workflow is not half a result.

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
- **Expect quiet.** The chat goes silent while waves run. That is the mode working, not a failure.
- Steering mid-run is normal and expected. The Bun rewrite was steered throughout.

## When to switch it back off

After the campaign that justified it. This is not a setting to leave on: with it on, every large request
carries the question "should this fan out?", and for most work here the answer is no — one mind holding
the whole picture, and one build to prove it.
