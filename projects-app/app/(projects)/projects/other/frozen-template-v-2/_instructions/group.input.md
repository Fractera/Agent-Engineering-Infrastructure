# THE INPUT GROUP — how work ENTERS this automation

Two kinds live here and no others: `input` — one door per channel of the outside world; and
`input-connector` — the single door to a node of ANOTHER automation.

## The inventory is already complete

This automation was born carrying one `input` node for EVERY channel of the vocabulary
(`control-panel`, `webhook`, `cron`, `public-page`, `telegram-bot`, `user-telegram-chat`), all hidden,
plus exactly ONE `input-connector`. So:

- You REVEAL a door (`state: "visible"`), you do not create it.
- Deleting an input door is refused — an unused one stays hidden, and that is what keeps this
  automation able to join a group later.
- A second connector is refused: there is exactly one, forever.
- `custom` is the only channel with no door of its own. It is the open door for a channel the owner
  defines himself; a node for it is ADDED when it is actually needed, never in advance.

## What an input node owes you

- It has NO incoming port. Nothing flows into it — the outside world is its source.
- Exactly one thing leaves it, into a `transform`.
- Its `ioType` is its channel key, and it is fixed for life: a `telegram-bot` door never becomes a
  `webhook` door. A different channel means a different node — reveal that one instead.
- ITS ONE JOB IS NORMALISATION. It receives the raw envelope its channel pushes in, and returns the
  SAME shape the middle already consumes — the same key names, whichever channel the work arrived
  through. That is what lets a second channel join an existing chain without touching it.
- The event is PUSHED into the automation. Never write a polling loop to fetch your own input.

## Revealing a second channel later

Adding a channel never removes the one already working: reveal the new door, normalise its payload to
the shape the middle speaks, connect it to the EXISTING middle node that does the work, and prove that
every older channel still runs. Two doors feeding one transform is normal and lawful.
