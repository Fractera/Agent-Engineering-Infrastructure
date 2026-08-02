# THE MIDDLE'S OPEN DOOR — when a node may be born, and where its knowledge comes from

> **Law of instructions: ENGLISH, COMPACT, one fact one home.** Its reader is a model that must read the core too, so every line here is paid on every session. Prune before you append; never restate what another instruction already says — link to it by name.

Every closed layer has a `custom` value in its vocabulary: an open door plus a law for adding to the
inventory. **The middle has no vocabulary, so it has no `custom` value either** — and this file is its
counterpart. Not "when may a value be added" but **when may a node be born at all**, and by what knowledge.

## The pair that replaces a vocabulary

A closed layer is bound by its list. The middle is bound by two things instead:

| Closed layers | The middle |
|---|---|
| vocabulary of values | corpus of node PATTERNS (external, dev-time) |
| derived function name | a name you choose — a verb of form |
| quota counted from the vocabulary | no quota: one node of each kind is the floor, growth is expected |
| `custom` = add a value | this file = the law of birth |

The corpus is the external store the whole fleet contributes to. It answers "how was this solved" and
returns a pattern — a description of the solution's shape — never a file. That is the decision of step 310,
and its reasons are worth carrying: a foreign node's file arrives with that folder's library contract, its
table names, its assumptions about the output layer, and its author's domain. A pattern arrives with none
of them.

## The link is ONE field

`lineage` on the node — the permanent id of the pattern this node descends from. The local `cuid` is the
identity of THIS node; `lineage` is the identity of the PATTERN across every server that ever used it.

- Guided by a pattern → record its `lineage`.
- Written from scratch → `lineage` stays empty; after a real run proves it, the node may become a pattern
  itself.
- **Nothing else connects a node to the corpus.** No import, no fetch, no client — one string.

## The run time boundary, stated once

**A running automation never touches the corpus.** Not to look something up, not to report, not to check a
version. Knowledge is federated; execution is local. If a node needs the corpus while running, the design
is wrong — the knowledge it needs belongs inside its own code by then.

## The three questions before a new node

Adding here is expected, not exceptional — but three questions still gate it:

1. **Is it ONE logical step?** A node that needs "and then" in its description is two nodes. One node, one
   function, one line on the canvas.
2. **Is it a transform or a decision?** Data in, different data out → `transform`. A choice about where the
   flow goes → a condition node. A decision hidden inside a transform cannot be seen on the canvas, cannot
   be rewired by the owner, and cannot be repaired without reading code.
3. **Does it survive the neutrality test?** Replace the subject with another noun — request, part, patient,
   shipment. A node that stops making sense belongs to one business; in a template it is a defect, in a
   real automation it is fine.

## What must never happen

- **Never paste a node from another automation.** Read its pattern, write your own.
- **Never re-classify the request.** It arrived classified (`ctx.intentClass`); doing the front's work here
  is how one automation ends up with two classifiers.
- **Never answer the human from here.** The reply belongs to the route.
- **Never say "this automation cannot".** Pattern → own code → `capability: needed` with a warning. There
  is no fourth outcome.
