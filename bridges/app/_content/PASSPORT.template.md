# PASSPORT.md — the entities of this project and the state of each

**Self-evolving. Born at the first development step, updated by every step after it.**

This is the one place that answers "what does this product consist of, and how far is each part". Not why
(that is `USE-CASES/`), not how the machine is arranged (that is `ARCHITECTURE.md`) — **what**, and **how
far along**.

## The table

One row per entity. Keep it a table: the moment a row grows into paragraphs it starts repeating the cases.

| Entity | What it is for | Cases | Platform tools | State |
|---|---|---|---|---|
| *(example)* Orders | Where a customer's order lives from placed to shipped | 02, 05, 07 | database, channels | works |
| *(example)* Catalogue | What the shop sells, browsable without an account | 01, 03 | database, object storage | in progress |

**Entity = what the product is ABOUT, not a screen.** "Orders" is one entity even when it has a list, a
card and a form. Splitting by screen inflates the table until it stops being a map.

**Service surfaces do not belong here** — sign-in, settings, legal pages, 404. They come with the
platform, not with the idea of this product.

**States:** `empty` (named, nothing built) · `in progress` (a step is working on it) · `works` (a case it
serves is actually true).

## Where it comes from

The first development step decides the **type** of the application (a landing page, a shop, a SaaS, a
payment product — whatever the confirmed cases imply), and from that type lays out the whole skeleton at
once: every entity as an empty page, connected by navigation, so the owner can WALK the product before a
line of business logic exists. That walk is the cheapest moment to say "a section is missing".

**Ten entities at most in the first skeleton.** Not a style rule: ten is about what a person can hold as a
map, and every entity here later demands a step of its own. If the cases imply more, say out loud which
entities were merged, which were postponed, and which case is left without an entity — a silently dropped
entity is a case that will never be covered, and nobody will notice for a month.

The cap applies to the FIRST skeleton, not forever. A new confirmed case may add an eleventh entity — as a
decision, not as drift.

## How it connects to the steps

- A step **takes one entity** from this table and moves it toward a case being true.
- Finishing the step **updates that row's state** — the state lives here, not in the step file.
- Coverage is therefore computable: **case → entity → step**. That chain is what tells you whether
  development is finished, and it is more honest than counting steps: twelve done steps mean nothing if
  two confirmed cases are touched by no entity at all.

## What must NOT be written here

- **Why it exists** — that is the case; write its number instead.
- **How data flows, which port, which store's schema** — that is `ARCHITECTURE.md`.
- **What was done and when** — that is the step file and git.

Every one of those, written here, turns the passport into a second copy of something that already exists,
and copies drift.
