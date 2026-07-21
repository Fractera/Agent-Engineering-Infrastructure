# KIND `transform` — the node that CHANGES data

PORTS (law, not a choice): `in` — required, from an `input`, another `transform`, or a
`condition-success`. `out` — required, into a `transform`, a `condition-success` or a
`condition-failure`. It carries NO channel: `ioType` is `null`.

WHAT IT IS FOR: it consumes data and returns DIFFERENT data — parse, normalise, extract, enrich,
deduplicate, calculate, format. Code lives in `_lib/nodes/<function-name>.ts`.

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
