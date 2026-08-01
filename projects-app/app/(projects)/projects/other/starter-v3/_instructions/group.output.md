# THE OUTPUT GROUP — how the result LEAVES this automation

Two kinds live here: `output` — one door per destination of the outside world; and `output-connector`
— the single door into a node of ANOTHER automation.

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
  handed over on the success branch — **or straight from the INTENT layer** (step 311), when the request
  needed no work over data at all: a question about the automation itself, a refusal, small talk. The
  shortest lawful flow is therefore `input → intent → output`, and the ordinary one is
  `input → intent → transform → condition-success → output`.
- What leaves it, leaves only INTO THE EVOLUTION LAYER (step 314), and that edge is OPTIONAL. The result
  is already delivered by then: the fifth layer does not carry it anywhere, it looks at the finished
  cycle and refines the automation itself. No evolution node → nothing leaves the door at all, and that
  is a lawful automation.
- Its `ioType` is its destination key and is fixed for life; a different destination is a different
  door — reveal that one.
- ITS ONE JOB IS DELIVERY: take what the branch handed over, put it into the form that destination
  demands, and deliver or persist it. If delivery genuinely fails, throw — a silent success is a lie
  the owner will discover much later.

## Several results, several doors

Every destination gets its OWN door: writing to the dashboard and answering in Telegram are two output
nodes, not one node with two jobs. Several branches may end at the same door — that is normal fan-in.
Revealing a new destination never silences one that already works.
