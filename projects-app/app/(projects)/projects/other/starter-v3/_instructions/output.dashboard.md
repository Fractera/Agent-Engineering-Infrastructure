# DESTINATION `dashboard` — the automation's own page

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**Function:** `deliverDashboard` (derived from the channel). **Keys:** none.

The default destination and the only one that works from the first minute: a row in the History table on the
automation's own page. No external service, no key, nothing to configure.

## What its function does

Takes what the route handed over and writes one row per successful run — date, source, title, text. The row
store is local to the folder.

## Opening it has a second half

Revealing this door is not enough: its TAB must be visible too (`presence: "expanded"`). **A result nobody
can see is not delivered** — that is the whole reason this destination exists.

## What it must never do

- **Never be the only destination for something urgent.** A row on a page is a record, not a notification;
  if a human must learn of it now, a message channel is the destination.
- **Never write on failure.** The History table is a record of what happened, and a failed run did not
  happen.

## When to reveal it

Always, unless the owner has a better place to look. When he names no destination, this is the one that
opens — it gives him something to see after the very first run.
