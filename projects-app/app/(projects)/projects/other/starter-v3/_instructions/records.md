# records — what a run LEAVES BEHIND, and where each piece belongs

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

Every run that creates something leaves the SAME shape, in every automation. This file is that shape. The
per-store rules live in `output.<channel>.md`; here is what is true of all of them.

## Two kinds of destination — never confuse them

| | ENTITY STORE | RUN JOURNAL |
|---|---|---|
| Which | `database` · `vector-memory` · `storage` · `map` · `calendar` | `history` · `analytics` · `toast` |
| Holds | what the automation OWNS | what HAPPENED |
| Writes when | the run really created something | **always** — a question is a run too, and it must be visible |
| Written by | `addEntityRow` (`_lib/rows.ts`) | `addRow` |

**Asking is not saving.** A run whose request class leaves no record (`read-own`, `self-describe`,
`refuse`, `small-talk`, `incomplete`, `unclaimed`) writes to NO entity store. This is not a convention you
remember — `addEntityRow` refuses, and there is no other way into a store.

## The full text lives in exactly ONE place

**The search index (LightRAG) gets the whole text. Our stores get a SUMMARY.** That is the whole reason
two different stores exist: the index SEARCHES by meaning, the stores KEEP and LINK.

- `summary` is present **always** — a short source simply equals its summary. A conditional field would
  force every reader (interface, agent, neighbouring automation) to branch.
- The limit is held at the WRITE, not by the middle's good intentions: source fits → copied verbatim, no
  model call; longer → the middle condenses it; no summary arrived → the write cuts at a sentence boundary
  and marks `summarySource: "truncated"`. The full text never reaches a store by accident.
- A row of `vector-memory` is a RECEIPT, not a copy: name, summary, `trackId`, links.

## Links are one representation, and the write sets them

Every row carries `links: [{table,id}]` to its siblings, **both ways**. A row of an entity store cannot be
born unlinked: `addEntityRow` links it — no node calls a linker, and no node can forget to.

- Do NOT invent per-neighbour fields (`storageIds`, `vectorIds`). Each new store would demand a new field,
  and the one added last would silently be missing everywhere. Derive the view with `linksOf(row, table)`.
- From any row, any relation is retrievable in one hop (`readLinked`). "No link" is not a state.

## Reading a store

Writing has 12 frozen doors; reading has primitives in `_lib/stores/read.ts` — one per store, named from
the same vocabulary (`deliverDatabase` → `readDatabase`). They are a LIBRARY, not nodes: reading FROM a
store is as finite as writing TO it, but the COMPOSITION of reads is infinite and belongs to the middle.

Each returns a named outcome — `found` · `empty` · `unreachable`. **"Unreachable" is not "empty":** a store
that refused and a store that answered "nothing" look identical in the data and mean opposite things.
