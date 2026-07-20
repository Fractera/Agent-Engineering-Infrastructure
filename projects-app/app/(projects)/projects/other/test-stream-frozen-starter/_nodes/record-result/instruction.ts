// The system instruction that generated this node's functions (co-located per node, step 243).
export const INSTRUCTION = `Build a deterministic function that writes a successful result into BOTH of this
automation's stores: (1) its dashboard rows store (through the existing rows API — never a bespoke table),
and (2) vector memory via ingestToMemory({ automation: "<category>/<slug>", text: <a plain-language summary
of the answer> }) — imported from ../../_lib/rows — so every answer is searchable later and tagged with this
automation's own address as provenance (never "unknown_source"). This node must be the LAST one, so it is
reached only after every earlier node succeeded. Every function must be typed (inputs and return) and scoped
to this node.`;
