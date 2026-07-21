# KIND `output-connector` — the outbound tail, left deliberately loose

PORTS (law, not a choice): `in` — required, and ONLY from a `condition-success`, exactly like an
ordinary door: what leaves this automation leaves on the success branch. `out` — OPTIONAL, and the
only thing it may name is `external`: a node of ANOTHER automation.

WHY THE OUTWARD SIDE MAY HANG FREE: its far end lives outside this graph. Unwired is its normal state.

THIS INSTRUCTION SAYS NOTHING ABOUT JOINING AUTOMATIONS TOGETHER, and you must not invent it. Gluing
automations into a chained group is a different process with its own canvas and its own architecture.
Your job ends at the tail: name what this automation is prepared to hand over. Do not call another
automation, do not design a protocol, do not assume anyone is listening.

- This automation must be FULLY OPERATIONAL with this connector hidden. A result that matters to the
  owner goes through a real `output` door — never only through the tail.
- There is exactly ONE of them: adding a second is refused, deleting this one is refused.
- Its `ioType` names the destination the handed-over data would speak, from the output vocabulary.
- Its function shapes the data for handover and nothing more. Code lives in
  `_functions/<function.name>.ts`.
