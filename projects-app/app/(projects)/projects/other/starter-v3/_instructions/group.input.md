# THE INPUT GROUP — how work ENTERS this automation

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

Two kinds live here and no others: `input` — one door per channel of the outside world; and
`input-connector` — the single door to a node of ANOTHER automation.

## The channels are DERIVED, not collected

A channel is the SHAPE in which work arrives — not who sends it and not what it is about. Three systems
posting HTTP are three senders on one door; invoices and job applications arriving by mail are one door.
The shapes are finite, and that is why this inventory can be frozen:

| How work arrives | Channel |
|---|---|
| a human types it on our own page | `control-panel` |
| the owner writes from his private chat | `user-telegram-chat` |
| anyone writes to the automation's bot | `telegram-bot` |
| a stranger uses the public surface | `public-page` |
| a machine pushes over HTTP | `webhook` |
| a letter is delivered by a provider | `email` |
| nobody sends anything — a moment arrives | `cron` |
| a neighbouring automation hands work over | the single `input-connector` |

Each channel has its own law: `input.<channel>.md`. The law for ADDING one — and the reasons the answer is
usually no — is `input.custom.md`.

## The inventory is already complete

This automation was born carrying one `input` node for EVERY channel of the vocabulary
(`control-panel`, `webhook`, `cron`, `public-page`, `telegram-bot`, `user-telegram-chat`, `email`), all hidden,
plus exactly ONE `input-connector`. So:

- You REVEAL a door (`state: "visible"`), you do not create it.
- Deleting an input door is refused — an unused one stays hidden, and that is what keeps this
  automation able to join a group later.
- A second connector is refused: there is exactly one, forever.
- `custom` is the only channel with no door of its own. It is the open door for a channel the owner
  defines himself; a node for it is ADDED when it is actually needed, never in advance.

## Which door to open at launch

The owner is asked, as a separate question of the Quiz that cannot be skipped, where requests should
ENTER. Open exactly the doors he named. If he named none, open `control-panel` — the automation's own
page exists from the first minute and needs no setup, no token and no external service, so it is the
one channel that always works. The core refuses a real project with every input door shut, so "open
none" is not an option you have.

## What an input node owes you

- It has NO incoming port. Nothing flows into it — the outside world is its source.
- Exactly one thing leaves it, into the INTENT layer — and into nothing else (step 311). There is no edge from a door into the middle any more: every run is understood before it is worked on.
- Its `ioType` is its channel key, and it is fixed for life: a `telegram-bot` door never becomes a
  `webhook` door. A different channel means a different node — reveal that one instead.
- ITS ONE JOB IS NORMALISATION. It receives the raw envelope its channel pushes in, and returns the
  SAME shape the rest of the automation already consumes — the same key names, whichever channel the
  work arrived through. That is what lets a second channel join an existing chain without touching it.
- IT NEVER CLASSIFIES AND NEVER ANSWERS. What kind of request arrived is decided by the intent layer;
  the reply is composed on the route. A door that answers was the v2 defect this law ended.
- The event is PUSHED into the automation. Never write a polling loop to fetch your own input.

## Reuse between automations

Doors are forms of arrival, not features, so they carry over to any automation unchanged — which is why the
inventory is part of the frozen template rather than something each project invents. What differs between
projects is which doors are REVEALED and what happens after them. Copying a channel into another project
means copying its law with it: the node and its instruction travel together, and its function name follows
from the channel by derivation, never by choice.

## Revealing a second channel later

Adding a channel never removes the one already working: reveal the new door, normalise its payload to
the shape the automation already speaks, connect it to the INTENT layer like every other door, and prove
that every older channel still runs. Many doors feeding one front is normal and lawful — that is exactly
what the intent layer is for: the request is understood once, whichever door it came through.
