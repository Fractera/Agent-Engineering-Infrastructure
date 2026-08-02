# THE INTENT GROUP — how a request is UNDERSTOOD before anything is done with it

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

One kind lives here and no other: `intent` — one node per CLASS OF REQUEST. This group sits between the
doors and the middle, and every run passes through it.

## Why this layer exists at all

The doors are finite: a message arrives from a panel, a bot, a cron beat, an inbox. What ARRIVES through
them is not finite in the same way — the same door carries requests that must produce completely different
behaviour: one states data, one asks for data from outside, one asks about data we keep, one asks about the
automation itself, and one must not be answered at all.

Before this layer existed, that decision was made by a transform in the MIDDLE, carrying the vocabulary of
one particular automation. Every other automation then had to accept a stranger's vocabulary or reinvent
the decision. Understanding a request is not domain work — it is the shape of the front door, and it
belongs to a layer of its own.

## The classes are DERIVED, not collected

Two axes, and every class sits on one of them.

**Axis 1 — where the answer lives:**

| Where the answer lives | Class |
|---|---|
| already in the message itself | `record-given` |
| in the outside world | `fetch-external` |
| in our own stores | `read-own` |
| outside AND in our stores, in that order | `composite` |
| in the automation's own passport | `self-describe` |
| nowhere it may lawfully come from | `refuse` |

**Axis 2 — what state the request is in:**

| State of the request | Class |
|---|---|
| it is about the automation's own setup, not about data | `control` |
| it is the second half of a request already begun | `continuation` |
| the intent is clear but the data is missing | `incomplete` |
| it asks for courtesy, not for action | `small-talk` |
| no class recognized it | `unclaimed` |

Eleven classes, one open door (`custom`). This is a partition, which is why it can be frozen: a new subject
area does not add a class, because it does not add an axis.

## The inventory is closed, and it is DECLARED once

Classes live in `IntentClassSchema` (`_data/automation.schema.ts`) and nowhere else. From that one
declaration follow three things, so they cannot drift apart:

- the node's class — its `ioType`, exactly as an input node's `ioType` is its channel;
- the class's law — `_instructions/intent.<class>.md`, the name derived, not chosen;
- the class's function — `intent` + the class in PascalCase (`read-own` → `intentReadOwn`), enforced by the
  schema.

The group's quota is COUNTED from the vocabulary, never typed in. `custom` is excluded from the count: it
is the open door, and a node for it is made only when one is actually needed
(`_instructions/intent.custom.md` — the law for growing the front).

So: you REVEAL a class, you do not create one. Deleting a class is refused; an unused class stays hidden.
And a class exists in the core ONLY together with its working function — a class node whose function does
nothing is a defect, not a placeholder.

## The law of the group

1. **Every run enters here.** `input` and `input-connector` lead only into `intent`. An edge from a door
   into the middle does not exist; there is no bypass to build.
2. **One node per class, never an N-way router.** Each class self-gates: mine → it claims the run
   (`intentClass`) and passes the flow on; not mine → it returns an EMPTY patch and the next class sees the
   flow untouched. Never `null`: the engine is linear, and `null` stops the whole run (see
   `kind.intent.md`). The FIRST claimer wins, so **the order of the class nodes in the core is their
   precedence** — narrow classes stand before wide ones, `unclaimed` stands last.
3. **A class may skip the middle.** `intent` leads into `transform` when work over data is needed, and
   straight into an `output` when it is not (self-description, refusal, small talk, a clarifying question).
   Skipping the middle is lawful — it is why this layer has its own row in the connection table.
4. **The decision is recorded.** A class puts `intentClass` and `intentRoute` into the context, so the run
   journal shows why a run went where it went. A front that decides invisibly is a second opaque
   classifier — the very thing this layer was built to abolish.
5. **No silent default.** An unrecognized request is never swept into a convenient class. `unclaimed` says
   so honestly — the same honesty the three-outcomes law demands of the middle.
6. **A class recognizes and routes; it never acts.** No writing, no fetching, no store contract in the
   front. The moment a class node touches a store, the layer has become the middle again.

## Reuse between automations

These classes are forms of address, not features, so they carry over to any automation unchanged — that is
the point of the layer. What differs between projects is which classes are REVEALED and what the middle
does after them. Copying a class into a new project means copying its instruction with it: the law and the
node travel together.
