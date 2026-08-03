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
- From any row, any relation is retrievable in one hop (`readLinked`) — by a node AND by the owner: the
  door `api/rows?table=<t>&id=<id>&linked=1` returns the row, its database record and the record's other
  facets, and that is what the entity drawer shows (`tab.md`). Links are written to be READ.

## 🔒 What LEAVES the folder carries a way BACK — the anchor law

An external store returns only what it stores, and it stores less than you assume. Proven the hard way: a
vector-memory chunk carries **no date at all** — only text, its provenance and an id. Ask it "when did we
talk about this?" and there is nothing to answer with.

So the shape is an ANCHOR, not a web:

- **one local row holds identity, time and `links`** — it is the only place where the full truth lives;
- **every copy sent outside carries a marker back to it** (`[mem#<id>]` inside the indexed text, plus the
  `trackId` kept on the row: one hop in each direction).

Do NOT try to keep everything linked to everything. Cross-links between every pair grow with the square of
the stores, rot silently when one is added, and were exactly the defect behind `storageIds`/`vectorIds`.
One anchor, one way back.

**The test before sending anything out:** *if this comes back to me a year from now, can I tell what it is,
whose it is and when it happened?* If the answer needs a field the external store does not keep — the way
back is the field.

## 🔒 A retrieval is a CANDIDATE, not an answer

A vector search NEVER says "nothing found": `hybrid` returns its nearest k chunks whatever you ask. Asked
about a roof repair that had never been mentioned, it returned a leaking tap — and the assistant agreed it
remembered the roof. **Similarity is not truth.**

So an excerpt becomes an answer only after it RESOLVES:

1. **whose** — its provenance names THIS automation (`recallScoped` drops the rest before anything is composed);
2. **which row** — its marker resolves to a live local record; a marker pointing nowhere is an ORPHAN, and an
   orphan is shown to nobody (it is also how a quotation lost its date);
3. **about what** — it shares a significant word with the question, or it is off-topic no matter how near
   the vectors were.

Fails any of the three → the candidate is discarded, and if none survive the honest outcome is `empty`.
**Never soften this into "probably related":** an unverified excerpt presented as memory is indistinguishable
from truth until the person checks, which makes it the most expensive lie this automation can tell.

## Reading a store

Writing has 12 frozen doors; reading has primitives in `_lib/stores/read.ts` — one per store, named from
the same vocabulary (`deliverDatabase` → `readDatabase`). They are a LIBRARY, not nodes: reading FROM a
store is as finite as writing TO it, but the COMPOSITION of reads is infinite and belongs to the middle.

Each returns a named outcome — `found` · `empty` · `unreachable`. **"Unreachable" is not "empty":** a store
that refused and a store that answered "nothing" look identical in the data and mean opposite things.
