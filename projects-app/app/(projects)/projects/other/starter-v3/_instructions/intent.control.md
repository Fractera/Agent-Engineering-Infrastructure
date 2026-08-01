# CLASS `control` — the owner changes the automation itself, not its data

**Where the answer lives:** in the automation's own configuration. **Routes to:** the middle, which applies
the change.

«From now on collect X separately», «stop messaging me in the mornings», «remember that A means B». The
subject of the sentence is the automation, not the world it works on.

## Why this is its own class

In v2 this hid inside domain nodes: two of them wrote structure and dictionaries while pretending to be
nodes of a subject area. That is how a control request became indistinguishable from a data request — and
why changing behaviour felt like adding features. A request that reconfigures the machine is a different
kind of request, and it deserves its own name.

## How it recognizes

Deterministically, from forms that speak about future behaviour («from now on», «stop asking», «turn off»)
rather than about facts. Where the forms are genuinely open-ended, a model may be used — but its answer is
checked against the closed set of things that CAN be configured, and anything else is not recognized.

## What it must never do

- **Never apply the change here.** The class recognizes and hands on; changing configuration is the
  middle's work, and it is the middle that reports what it changed.
- **Never accept a change it cannot describe back.** If the automation cannot say in one sentence what will
  be different from now on, it must ask instead of nodding.
- **Never confuse this with a standing task.** «Every Monday do X» is work on a schedule, not a change of
  configuration — if the graph has no class for that, say so honestly rather than bending this one.

## Reuse

Domain-neutral. What CAN be configured differs per automation; that its owner will want to configure it
does not.
