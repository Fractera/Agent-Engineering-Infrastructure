// The system instruction that generated this node's functions (co-located per node, step 223.C.2).
// Kept as a string module (not .md) so it needs no markdown loader; it reads as markdown.
export const INSTRUCTION = `Build deterministic functions that gather source material for the given
topic. Fetch candidate sources up to \`count\`, then de-duplicate them. Do the mechanical work in
application code; call an external AI tool ONLY if a step truly needs generation (none needed here).
Every function must be typed (inputs and return) and scoped to this node.`;
