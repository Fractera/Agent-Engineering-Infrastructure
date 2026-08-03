# KIND `speech` — the automation SPEAKS

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

One node, `converse`. It writes `ctx.reply` — the ONE answer every open channel then delivers. No validator:
it decides nothing about where the flow goes, it produces content.

## Why a layer and not a middle node

The answer is CONTENT, not a destination: it must exist before any channel carries it, and all channels
carry the same one. And **five of the eleven request classes never reach the middle** — refusal,
self-description, small talk, incomplete, unrecognised. Those are the ones made of speech entirely, so a
speaking node living in the middle would never see them (step 312, reversing the role-in-`transform` idea).

## What it reads, and what it must never do

Reads: the behaviour scenario (`assistant` tab `data.instruction`), the abilities derived from the core, the
addresses and access roles, the dialogue plane, the question-answer examples, and what the run produced.

- **Never enumerate phrases in code** to answer greetings or "who are you" — that is writing a function
  where an instruction belongs. Only literal service commands (`/start`) are matched deterministically.
- **Never invent an ability, an address or a saved record.** The derived facts outrank the behaviour text;
  contradicting them is the defect this layer was built to remove.
- **Never let an output node compose speech.** A channel delivers `ctx.reply`; it does not write it.
- No model or no key → the deterministic fallback answers and the run does NOT fail.

## Who says WHAT to say

A class of the front declares the KIND of answer (`speechAct`: refuse · greet · describe-self · ask ·
not-understood) and, where needed, its subject (`speechAbout`). This node phrases it — in the chat's
language. A class that writes finished prose is the defect of step 312.5: it arrives in one language and
the speech node overwrites it anyway.

## Language — three different things, never merged

1. **the chat's own choice** ("let's speak Ukrainian") — strongest, lives in the dialogue plane and outlives runs;
2. **the chat language setting** (`assistant` tab, `language.chat`) — set and non-empty ⇒ always used;
3. **the platform default** — used ONLY when the human has written nothing yet and the automation speaks
   first. When he has written, his language wins over the default: he showed it by writing.
