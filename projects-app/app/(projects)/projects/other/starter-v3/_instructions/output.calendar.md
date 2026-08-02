# DESTINATION `calendar` — an event that waits for its moment

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**Function:** `deliverCalendar` (derived). **Keys:** none.

The one destination that does not deliver NOW: it records that something is due, and the moment announces
itself later. Everything else about it follows from that.

## What its function does

Writes an entry — date, time, title, type, how long before to notify, which integrations to announce it
through. The event's time comes from the route (a moment parsed upstream) and outranks the moment of
capture: "remind me tomorrow at three" belongs tomorrow, not now.

## No time, no entry

If the moment is unknown, the automation ASKS. An entry with a guessed time is worse than no entry: it fires
at the wrong moment and the owner stops trusting the calendar entirely.

## The scheduler exception — read before "unifying" anything

"One destination, one door" has exactly ONE recorded exception, and it lives here: a scheduler channel may
declare outward INTEGRATIONS and announce the SAME due event in several places. It is not three deliveries;
it is one event announced several ways, chosen per entry by the owner. The integrations add **no node and no
edge** — they appear as badges on this one node. For every other destination the ordinary law stands: a
second addressee is a second node.

## When to reveal it

Whenever the automation deals with anything that happens LATER.

## An event is a FACET, not a record (step 311.9а)

It describes WHEN, so it carries no summary — its content is the moment. Like every facet it is linked to
its record by the write itself, in both directions. A run whose class leaves no record creates no event
either, however clear its date. Full shape: `records.md`.
