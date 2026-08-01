# KIND `transform` — the node that CHANGES data

PORTS (law, not a choice): `in` — required, from the INTENT layer (step 311 — work reaches the middle
only after the request has been understood; a door no longer connects here directly), another
`transform`, or a `condition-success`. `out` — required, into a `transform`, a `condition-success` or a
`condition-failure`. It carries NO channel: `ioType` is `null`.

WHAT IT IS FOR: it consumes data and returns DIFFERENT data — parse, normalise, extract, enrich,
deduplicate, calculate, format. Code lives in `_lib/nodes/<function-name>.ts`.

## 🔒 THE VALIDATOR — without it the function always lets the result through

**A transform may not exist without a validator.** This is not a style rule; it is the law that keeps a
failure from becoming a success.

What it fixes, in one real case: a fetching node received HTTP 403 from its source and returned «nothing
found» as an ordinary context patch. The engine merged the patch and went on — for the graph the node had
succeeded, and the run reported success while nothing had been fetched. No amount of type-checking or
schema validation sees that, because the shape was perfectly valid.

So the node declares two things in the core, and both are mandatory:

- **`outcomes`** — the list of possible outcomes, **at least two**. Outcomes are not «ok / not ok»: there
  are many on each side («above 80% is success, the rest is failure», «found», «missing», «unreachable»,
  «not mine»). Each names its condition (`when`) and what it puts into the context (`puts`).
- **`validator`** — the function that CLASSIFIES the result into one of those outcomes. Its name is DERIVED
  from the function's name (`fetchExternal` → `fetchExternalValidate`), never chosen, and it lives in
  `_lib/validators.ts`.

Three levels enforce it, and each catches what the previous one lets past:

| Level | Catches |
|---|---|
| the schema | a node with no validator, a foreign validator name, fewer than two outcomes |
| module load (`_lib/validators.ts`) | a validator declared in the core but absent from the registry |
| the engine (`_lib/executor.ts`) | a result the validator cannot name → the run **fails honestly**, with the reason |

**«Unreachable» is not «missing».** The single most valuable thing a validator does is keep these apart: a
source that refused and a source that answered «nothing» look identical in the payload and mean opposite
things to the human.

## How a transform is BORN (step 310 — the procedure, not a preference)

Unlike a door or a class, this node has no vocabulary to be derived from: nothing generates its name, its
law or its function. It is written — and it is written in this order:

1. **Ask the corpus of node patterns.** «A node that does X» returns PATTERNS: the shape of the solution,
   what it reads from the context, what it puts back, how it degrades honestly. It does not return a file to
   paste, and there is no button that would paste one.
2. **Write your own code from the pattern**, in this folder, against this folder's library. If a pattern
   guided it, record that pattern's id in the node's `lineage` — that is the ONLY link between a node and
   the corpus, and it is what lets the fleet tell which patterns actually work.
3. **No pattern fits → write it from scratch**, `lineage` empty. Once it is proven on a real run it may be
   contributed back as a new pattern.
4. **The work reaches outside our own code** (a third-party API, an MCP server, an agent skill) →
   `capability: needed` plus a warning naming what the node must do, and the build pauses honestly there.

**Never at run time.** The corpus is consulted while BUILDING. A transform that calls it during a run makes
a client's automation depend on our service, and that dependency is forbidden.

## The name is chosen, so choose it as a VERB OF FORM

Doors and classes derive their names; a transform does not, which is exactly where a domain leaks in.
Name it for the SHAPE of the work — `fetchExternal`, `describeObject`, `resolveLocation`, `resolveMoment` —
never for a business noun (`digitizeMoney`, `defineGlossary` are the v2 mistake). Apply the neutrality test:
replace the subject with another noun — request, part, patient, shipment. If the name stops making sense,
the node has taken a domain in with it.

- IT NEVER DECIDES WHERE THE FLOW GOES. Choosing a path is a condition's job. If your function is
  about to end in "…and then, depending on the result, do A or B", stop: what you have is a transform
  followed by a condition.
- IT NEVER DELIVERS OUT OF THE AUTOMATION and never writes the final result to a destination. It hands
  its data to the next node; delivery happens at a door, reached through a success branch.
- ONE TRANSFORMATION PER NODE. "Parse and enrich" is two nodes. The test is `returns`: if naming what
  comes out needs the word "and", split it.
- FAN-IN IS NORMAL: several nodes may feed one transform when they all hand it the SAME shape — that
  is exactly how a second channel joins an existing chain.
- FAN-OUT IS ONLY FOR THE SAME DATA: leading into two nodes is lawful when both consume the same
  produced value (record it AND announce it). If they should receive it under different circumstances,
  that is branching — insert a condition.
- ITS CONTRACT IS PUBLIC. Once other nodes rely on the names in `accepts` / `returns`, you may add to
  them; you may never rename or repurpose them.
- IT MAY BE NATIVE OR AN EXTERNAL CAPABILITY. Most transforms are native code (the list above). But a
  transform whose CORE WORK must reach a world tool you cannot write — machine-translate, clone a voice,
  synthesise media — is an EXTERNAL CAPABILITY: carry it in the node's `capability`, and if no tool is
  supplied yet, set `capability.status: "needed"` + a warning and do not improvise. See passport §8.5a and
  `tools-docs/external-capabilities.md`.
