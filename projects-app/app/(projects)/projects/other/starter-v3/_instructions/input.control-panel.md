# CHANNEL `control-panel` — the automation's own page

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**Function:** `receiveControlPanel` (derived from the channel). **Keys:** none.

The default door, and the only one that works the minute the automation is born: a form on its own page —
no token, no external service, no setup. When the owner names no entry channel, this is the one that opens,
and the core refuses a real project with every input door shut, so "none" is not an option.

## What its function does

Takes the form fields of a run started from the panel and normalises them into the shape the rest of the
automation consumes: text, source marker, moment, and coordinates when the form supplied them.

## What it must never do

- **Never treat itself as a debug door.** It is the production channel of an automation whose owner may have
  no Telegram and no webhook. Everything that works elsewhere works here.
- **Never accept an empty message** — an empty capture starts nothing and is refused at the door.
- **Never classify and never answer.** What kind of request arrived is the intent layer's decision; the
  reply is composed on the route.

## When to reveal it

Always, unless the owner explicitly wants the automation unreachable from its own page. It costs nothing and
it is the only channel that cannot break.
