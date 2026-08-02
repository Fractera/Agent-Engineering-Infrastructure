# CLASS `fetch-external` — the data is not in the message; it must be brought from outside

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**Where the answer lives:** in the outside world. **Routes to:** the middle, carrying the subject.

«Show me X», «how much is Y now», «who is Z». The message carries only the NAME of a subject — everything
else has to be fetched.

## The line between this class and `record-given`

One line, and it is not about wording: does the message CARRY the data, or only NAME it? «I spent 20 on
coffee» carries data — nothing needs fetching. «How much is coffee» names a subject — everything does.

## Neutrality — the point of this class

The subject is supplied by the human at run time. The automation does not know and must not know whether it
is a tower, a whale or an engine. Any hint of a subject area inside this class (a list of known topics, a
domain-specific parser) is a defect: it would turn a form of address into a feature of one business.

## How it recognizes

Deterministically, from request forms («show», «find», «what is», «who is», «how much is»). The subject is
passed on as the human wrote it, unparsed — parsing belongs to the middle.

## What it must never do

- **Never fetch here.** No network call from a front node. It recognizes and names the subject; the middle
  and the capability it declares do the fetching.
- **Never guess the source.** Which source is used is a decision of the middle node, recorded in that
  node's capability — not a constant hidden in the front.
- **Never invent the subject.** If the request names nothing, this is `incomplete`, not this class.

## Reuse

Domain-neutral, and the widest gateway to the outside world any automation has.
