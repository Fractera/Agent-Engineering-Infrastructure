# ARCHITECTURE.md — the machine under this application

**Self-evolving, and deliberately almost empty.**

This document is about the **machine**: which stores exist, on which addresses the services answer, how
your code is allowed to reach them, and which decisions are expensive to reverse. It is not about what
the product is for (`USE-CASES/`) and not about how far each part has come (`PASSPORT.md`).

## Why there is no content here yet

**The most important question this document will answer is still open.** How the product layer talks to
the data layer — how much of that layer is reachable from your code at all, through which door, and what
stays out of reach — is not decided in this product yet. Writing a plausible answer here now would be
worse than writing nothing: the next session would build on it, and a confident wrong boundary is the most
expensive kind of wrong.

So this file stays a frame until that decision is made, and then it records the decision — not a guess
about it.

## What goes here once there is something to write

- The stores and the ONE correct way to write to each.
- The services, their addresses, what they answer and what they refuse.
- The places where your code crosses into the platform.
- The decisions that are expensive to reverse, each with its reason — a decision without its reason gets
  undone by the next session.

## What never goes here

- Anything git already records: file lists, what changed when.
- The purpose of the product — `USE-CASES/`. The state of the work — `PASSPORT.md`.
- The catalogue of platform tools — `PLATFORM-TOOLS.md`, which is GENERATED; a copy here becomes a stale
  twin that lies after the next tool is installed.

## For the agent

Append a structural decision the moment it is made, not at the end of the step. Write facts that can be
acted on — an address, a name, a rule, a refusal. "The architecture is modular" is not a fact.

**And if the boundary you need is one of the open questions above: ask the architect rather than deciding
it here.** Recording an invented boundary in this file makes it look agreed.
