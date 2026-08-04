# `_checks/` — the fixed set of behaviour checks

`npm run check:core` proves the core is LAWFUL. It cannot prove the automation WORKS: every defect of the
last three steps compiled fine, passed the schema, and still lied — a question that never reached the
person, an instruction the build could not keep, a fetch that failed and reported success. Those are only
caught by RUNNING the thing and looking at what came out.

That is this folder. A fixed set of live runs with expectations, run on every change:

```bash
npm run check:behavior          # from projects-app/, against the server it runs on
```

## Why fixed, and why it travels with the automation

**Fixed** — the value is in the number staying the same. A check invented after the fact proves nothing;
the same six cases run before and after a change tell you whether the change cost you a capability.

**Inside the folder** — a clone inherits its checks (law 0: the folder is self-sufficient). An automation
whose proofs live somewhere else has no proofs the day it is copied.

## What a case may assert

| Field | Meaning |
|---|---|
| `input` | the body posted to `api/run` — exactly what a channel would push |
| `useTask` | substitute the first use case's cuid as `taskCase`, i.e. the person chose from the list |
| `expect.ok` | the run finished without a failing node |
| `expect.context` | fields of the run context: a string means equals, `{nonempty}` / `{contains}` / `{absent}` |
| `expect.coreContains` | the core itself changed — for evolution, which writes to `automation.json` |
| `expect.cheaperThan` | this case must cost strictly fewer model calls than the named one |
| `expect.cost` | the price ratchet: `{nodeFunctions, modelCalls}` — measured, and refused when it grows |

## The price ratchet

Every case records what it cost: **how many node functions ran** and **how many times the model was
asked** (`outcome.cost`, counted in `_lib/ai.ts` per run). Both are printed on every run, and a case with
a recorded `cost` FAILS when the price grows. This is the doctrine of scale made checkable — the claim
"every extra ability is paid on every run" is worth nothing until the number is on screen.

A price that legitimately grows is a decision, not an accident: change the number in `cases.json` in the
same commit, so the diff shows what the capability cost.

## What the run does to the automation, and what it puts back

Behaviour cannot be checked without side effects: runs write journals, stores, dialogue state, and
evolution rewrites the core. So the runner snapshots `_data/automation.json` and `_data/runtime/rows.jsonl`
before the suite and **restores both to the byte after it** — and restores the rows before EVERY case, so
cases cannot contaminate each other through the shared dialogue.

Two consequences worth knowing: run the checks when no one is using the automation, and never treat a
restored snapshot as a way to author the core — writing is the door's job (`api/patch`), always.

## Adding a case

Add one when a defect is found in BEHAVIOUR — that is the moment its cost is proven. Write down in `why`
what the case would have caught, in the words of what went wrong. A case whose `why` reads like a feature
description is not a check, it is documentation.
