# `evolution.graph` — the automation and its OWN graph

This scope is declared, and its law is a BOUNDARY, not a feature. Read it before you consider giving an
automation the right to rewire itself.

## The rule

**A run never adds, removes or reconnects a node of its own graph.** The self-writing door (`self-write.ts`)
reaches exactly two things — `assistant.data` and `history` — and that is the whole of what evolution may
touch. Nodes, edges and the passport are not its business, in any scope, including this one.

## Why the scope exists anyway

Because the NEED is real and must have an address. A person asks for something the build cannot do; that ask
has to land somewhere honest. It lands in `capability-gap` — a journal entry plus a warning to the owner —
and the owner decides. What it must never do is turn into a node the automation grew for itself while
answering a message.

## Why not let it grow itself

Three reasons, and the first one is measured.

1. **Every visible node is executed on every run** (measured 2026-08-04: a bare "hello" ran 33 node
   functions). A node the automation grants itself is paid for by every later message, including the ones
   that have nothing to do with it. Self-growth is the one change whose cost nobody chose.
2. **Growth goes SIDEWAYS.** An automation carries 2–5 tasks; the answer to "it cannot do X" is normally
   ANOTHER automation — a clone that opens the doors it needs — not another node here (`_lib/scale-rules.ts`).
3. **A graph edited mid-run cannot be reviewed.** The owner reads the diagram and the use cases to know what
   his automation is; a shape that changes itself between two readings is not a thing he can be responsible
   for.

## What to do instead — in order

1. Write the gap: what was asked, in the person's words (`evolution.capability-gap`).
2. Tell the person plainly it is not part of this build yet, and name what IS. Never promise it for later —
   the automation has no way to add it, and saying otherwise is a promise it cannot keep.
3. Leave the decision with the owner: build it here if the same job is under budget, clone for a different
   job with the same channels and stores, start fresh when nothing is shared.

## For a developing agent

If you were sent here looking for the mechanism to let an automation edit its own graph: it does not exist,
and its absence is deliberate. Building one would break the three reasons above at once. Extend the
capability-gap journal instead, or give the owner a clearer warning — that is where this need belongs.
