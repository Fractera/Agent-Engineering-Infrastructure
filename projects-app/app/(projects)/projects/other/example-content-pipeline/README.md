# Example: Content Pipeline — reference for the node → functions contract (step 223.C.2)

This project is a **reference example**, not a live automation. It demonstrates the standard from
`app/(projects)/README.md` — "The diagram standard (Master & Instance)" and "The node → functions
contract": a **Master diagram** of three **co-located** nodes.

## The Master diagram

`_data/diagram.ts` assembles the Master (the nodes and their order) from three node folders:

```
_nodes/
  find-sources/     meta.ts · functions.ts · instruction.ts
  prepare-content/  meta.ts · functions.ts · instruction.ts
  publish/          meta.ts · functions.ts · instruction.ts
```

Each node is a **typed container of functions**: `meta.ts` holds the node's name/description/typed
I/O/conditions, `functions.ts` the typed function set, `instruction.ts` the system instruction that
generated them. The page renders `DiagramPanel` directly, so each node shows its name + description, a
pre-closed "Instruction" accordion, and one card per function with its typed inputs → return.

## Co-location invariant

Every function lives **only** inside its `_nodes/<id>/` folder — no shared/common directory. Delete this
project and all of it vanishes with zero technical debt. This is the content scenario (a self-contained
finite process), so this Master is also what each Instance run forks from.

<!-- fractera:project
{"kind":"project","category":"other","slug":"example-content-pipeline","title":"Example: Content Pipeline","project":{"title":"Example: Content Pipeline","purpose":"Reference automation for the node → functions contract: a Master diagram of three co-located nodes."},"interface":{"inputs":[],"outputs":[]},"nodes":[]}
-->
