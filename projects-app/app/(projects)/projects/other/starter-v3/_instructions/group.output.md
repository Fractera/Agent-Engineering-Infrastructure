# THE OUTPUT GROUP — how the result LEAVES this automation

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

Two kinds live here: `output` — one door per destination of the outside world; and `output-connector`
— the single door into a node of ANOTHER automation.

## The destinations are DERIVED, not collected

A destination is a KIND OF PLACE a result can end up in — not a recipient and not a format. Three people
receiving mail are three recipients on one door; a result rendered as a table or as a sentence is the same
door. The kinds are finite, and that is why this inventory can be frozen:

| Where a result ends up | Destination |
|---|---|
| on the automation's own page, to be looked at | `dashboard` |
| on the public surface, for strangers | `public-page` |
| in a conversation with the owner | `user-telegram-chat` |
| in a conversation with anyone | `telegram-bot` |
| in a letter | `email` |
| waiting for a moment | `calendar` |
| as a point in space | `map` |
| as a number over time | `analytics` |
| kept as a fact | `database` |
| kept as meaning, findable by words | `vector-memory` |
| kept as bytes | `storage` |
| handed to a neighbouring automation | the single `output-connector` |

The last three are STORES rather than deliveries: nothing is sent anywhere, something is kept so it can be
found later. Each destination has its own law: `output.<channel>.md`. The law for ADDING one — and why the
answer is usually no — is `output.custom.md`.

## The inventory is already complete

This automation was born carrying one `output` node for EVERY destination of the vocabulary
(`public-page`, `dashboard`, `calendar`, `analytics`, `map`, `email`, `telegram-bot`,
`user-telegram-chat`, and the three stores `vector-memory`, `database`, `storage`), all hidden, plus
exactly ONE `output-connector`.

- You REVEAL the destination you need; you never create or delete a door.
- A second connector is refused: there is exactly one.
- `custom` has no door of its own — a node for an owner-defined destination is ADDED when it is really
  needed.

## Which door to open at launch

The owner is asked, as a separate question of the Quiz that cannot be skipped, where results should GO.
Open exactly the destinations he named. If he named none, open `dashboard` — the History table on the
automation's own page: it is always present, needs no external service, and gives the owner something
to look at after the very first run. The core refuses a real project with every output door shut.

Opening the `dashboard` door has a second half: make its tab visible as well (`tab` → `presence:
"expanded"`). A result nobody can see is not delivered.

## What an output node owes you

- It receives from a `condition-success` — a transform never delivers straight to a door, the result is
  handed over on the success branch — from the INTENT layer (step 311), when the request needed no work
  over data at all, or **from the SPEECH layer** (step 312), which is where the human's answer is written.
  The talking flow is `input → intent → speech → output`; the ordinary one is
  `input → intent → transform → condition-success → speech → output`.
- **A door delivers the answer, it does not compose it.** `ctx.reply` belongs to the speech node
  (`kind.speech.md`); an output that writes speech inside itself is the defect step 312 removed.
- What leaves it, leaves only INTO THE EVOLUTION LAYER (step 314), and that edge is OPTIONAL. The result
  is already delivered by then: the fifth layer does not carry it anywhere, it looks at the finished
  cycle and refines the automation itself. No evolution node → nothing leaves the door at all, and that
  is a lawful automation.
- Its `ioType` is its destination key and is fixed for life; a different destination is a different
  door — reveal that one.
- ITS ONE JOB IS DELIVERY: take what the branch handed over, put it into the form that destination
  demands, and deliver or persist it. If delivery genuinely fails, throw — a silent success is a lie
  the owner will discover much later.

## Reuse between automations

Destinations are kinds of place, not features, so they carry over to any automation unchanged — which is why
the inventory belongs to the frozen template and not to each project. What differs is which doors are
REVEALED and what the route hands them. Copying a destination into another project means copying its law
with it; its function name follows from the channel by derivation, never by choice.

## Several results, several doors

Every destination gets its OWN door: writing to the dashboard and answering in Telegram are two output
nodes, not one node with two jobs. Several branches may end at the same door — that is normal fan-in.
Revealing a new destination never silences one that already works.
