# CLASS `incomplete` — the intent is clear, the data is missing

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**Where the answer lives:** with the human, who has not said it yet. **Routes to:** SPEECH, then an output —
one question back. The class declares `speechAct: ask` and WHAT is missing; the question is worded by the
speech layer, in the language of the chat. Writing the question here was the defect of step 312.5: speech
overwrote it, so the human never saw it.

«Record» — record what? The automation understood the task and has nothing to perform it on.

## Why asking is a first-class outcome

The alternative to asking is guessing, and a guess that looks confident is the most expensive mistake an
automation can make: the owner does not notice it. A question costs one message and keeps the record true.
This class is the reason «the automation did something odd and nobody knows why» does not have to happen.

## Working with `continuation`

It leaves the question outstanding (`pendingQuestion`) and `continuation` picks it up in a LATER run. The
outstanding question lives in the dialogue plane (`group.speech.md`) and outlives the run — before that
plane existed it died with its run, and `continuation` could never claim. Together they are ONE mechanism
at the layer, not a private arrangement inside some node.

## How it recognizes

A bare task verb with no subject, short — deterministically, and otherwise by the model reading the request
(`intent-gate`), because recognition may not depend on the language the human wrote in. Deliberately narrow:
being wrong here means asking a question the human already answered, which is nearly as annoying as guessing.

## What it must never do

- **Never ask more than one question at a time.** A questionnaire in a chat is an interrogation.
- **Never ask what it can derive.** If the missing piece is in the context, it is not missing.
- **Never leave without asking.** Claiming and staying silent strands the human mid-task.

## Reuse

Domain-neutral. What data is missing differs; that it will be missing does not.
