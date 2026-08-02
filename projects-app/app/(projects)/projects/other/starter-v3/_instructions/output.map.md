# DESTINATION `map` — a marker on the automation's map

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

**Function:** `deliverMap` (derived). **Keys:** none (the geo service answers behind `api/geo`).

A place, with a title, at coordinates. The map tab draws what this door writes.

## What its function does

Writes a marker: coordinates, a title, and whatever the route attached to the place.

## No coordinates, no marker

Not every channel carries a location. A message without coordinates is delivered **honestly degraded** — the
door skips with a reason in the context and **never** invents a point. A marker in the wrong place is not a
smaller version of the right one; it is a lie the owner will act on.

## What it must never do

- **Never geocode here.** Turning a name into coordinates is work, and work belongs upstream; this door
  delivers what it was given.
- **Never duplicate a marker the route already created.** If an upstream node created and linked the place,
  it says so, and this door stands aside.

## When to reveal it

When WHERE is part of the answer, not just part of the data. If nobody will ever look at a map, coordinates
belong in a record store instead.
