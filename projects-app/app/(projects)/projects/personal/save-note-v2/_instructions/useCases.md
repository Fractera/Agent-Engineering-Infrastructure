# USE CASES — what this automation is, in the owner's own words

A case is one scenario the owner wants to live: what happens, when, and what he sees at the end. The
SET of cases must be enough, on its own, to build the whole automation. Read them before you look at a
single node. No case, no node — a node nobody asked for is waste, however clever.

## The rules you work by

- YOU DO NOT INVENT CASES. If the owner's description is not enough to build from, write a warning on
  `useCases` naming exactly what is missing — the question you would ask him — and stop there.
- A CONFLICT BETWEEN CASES lives on the SET, not on either case: each one is fine alone, so the
  warning belongs here. Say which two cases collide and what makes them irreconcilable.
- `number` IS HOW THE OWNER SPEAKS: "in case 02, change…". It is unique and the core issues it when a
  case is appended — `POST api/patch { op: "append", object: "useCases", value: { text, status } }`.
- `status` WALKS ONE WAY: `new` → `in-development` → `in-use`. Move it as you actually work: `new`
  means nobody has touched it, `in-development` means you are building it now, `in-use` means the
  automation really serves it and you proved it.
- YOU MAY REFINE THE TEXT of a case only to make the owner's own meaning precise — never to narrow it
  to what you managed to build. If you built less than the case asks, the case stays as it is and the
  shortfall goes into a warning.

## Their weight

A real project without a single case is unlawful — the core refuses it. That is deliberate: an
automation is defined by what it is for, not by the nodes that happen to exist inside it.
