# THE GRAPH — the nodes and the edges between them

An edge is DATA FLOWING DOWNSTREAM. It is never decoration and never "this one belongs to that one".

## Making and unmaking edges

- `POST api/patch { op: "connect", from, to }` — the cuids of two nodes. The core issues the edge's
  own cuid and returns it; its visibility is derived (an edge is shown only when BOTH ends are shown).
- `POST api/patch { op: "disconnect", edge }` — by the edge's cuid.
- Nodes and edges are known ONLY by cuid. A `name` is for the owner and never a reference.

## What the core refuses, so you do not have to remember it

- An edge whose target kind is not named in the source's `out.connections` — the law is checked from
  the SOURCE side.
- An edge out of a node whose `out` is prohibited, or into a node whose `in` is prohibited.
- A node leading into itself.
- A visible edge with a hidden end.
- A VISIBLE node with a required port and no edge on it. A HIDDEN node may stand unwired — that is how
  a frozen template ships, with everything hidden and nothing running.

## What the core cannot see, and you must

- RECITE THE PATH before you mount anything: from some input, through your node, to some output. If
  you cannot say that sentence out loud, the wiring is wrong — no validation will catch it for you.
- NO STARVED NODES (nobody produces what it consumes) and NO DEAD ENDS (nobody consumes what it
  produces). A produced value nobody reads is the definition of a dead node.
- THE FLOW DOES NOT RETURN to a node it has already passed. Repetition comes from RUNS — a schedule, a
  new message — never from an edge leading backwards.
- WHEN YOU REWIRE, count both ends: your new edge changes the other node's picture too.
