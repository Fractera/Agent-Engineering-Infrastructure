// The system instruction that generated this node's functions (co-located per node, step 243).
export const INSTRUCTION = `Build a deterministic function that writes a successful lookup into this
automation's own dashboard rows store (through the existing rows API — never a bespoke table). This node
must be the LAST one, so it is reached only after every earlier node succeeded — a failed ask must never
produce a history row. Every function must be typed (inputs and return) and scoped to this node.`;
