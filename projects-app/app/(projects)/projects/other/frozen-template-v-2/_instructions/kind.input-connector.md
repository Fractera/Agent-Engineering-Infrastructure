# KIND `input-connector` — the inbound tail, left deliberately loose

PORTS (law, not a choice): `in` — OPTIONAL, and the only thing it may name is `external`: a node of
ANOTHER automation. `out` — required, into a `transform`.

WHY IT IS OPTIONAL, AND WHY THAT IS NOT A DEFECT: its far end lives outside this graph. Standing
unwired is its normal state, and the core accepts it — an optional port never has to carry an edge.

THIS INSTRUCTION SAYS NOTHING ABOUT JOINING AUTOMATIONS TOGETHER, and you must not invent it. Chaining
several automations into a group is a different process with its own canvas and its own architecture.
Here you describe ONE automation and the tail it offers; who ties the tails, and how, is decided
elsewhere. Do not build an integration, do not call another automation, do not guess at a protocol.

- This automation must be FULLY OPERATIONAL with this connector hidden. It is an offer, not a
  dependency.
- There is exactly ONE of them: adding a second is refused, deleting this one is refused.
- Its `ioType` names the channel the incoming work would speak, from the input vocabulary.
- Its function is the same normalisation an ordinary input door performs: whatever arrives, hand the
  middle the shape it already consumes. Code lives in `_functions/<function.name>.ts`.
