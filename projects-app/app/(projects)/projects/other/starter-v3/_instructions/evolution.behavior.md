# EVOLUTION `behavior` — the automation edits its own behaviour instruction

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

Writes ONE field: `assistant` tab → `data.instruction`. Nothing else, ever.

## What it adds, and what it must not

A **standing rule about what to DO or stop doing**, in one short imperative line, taken from what the person
actually asked. Not style — that is `voice`. Not a fact to remember — facts live in the stores.

- **Append, never rewrite** (П1). The text was written by the owner; a full rewrite takes away both his
  understanding of what changed and his ability to roll it back. Every change leaves a version in `history`.
- **A ceiling, and a change of MODE at it** (П3). The instruction is sent to the model on EVERY run, so it
  cannot grow forever. At the limit the node stops appending and starts **condensing**: the same rules in
  fewer words. Condensing is not losing a rule — dropping one is a defect.
- **Nothing personal** (П4). No names, addresses, amounts, credentials. The instruction is a system text,
  not a memory of a human being.

## What is NOT here

The list of abilities. It is DERIVED from the core on every run (`abilities.ts`, step 312.4), so it cannot
rot and there is nothing to rewrite. Computing beats rewriting, so the older plan to have this node maintain
that list is void.
