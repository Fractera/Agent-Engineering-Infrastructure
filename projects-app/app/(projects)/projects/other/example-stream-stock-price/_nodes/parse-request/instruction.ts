// The system instruction that generated this node's functions (co-located per node, step 243).
// Kept as a string module (not .md) so it needs no markdown loader; it reads as markdown.
export const INSTRUCTION = `Build deterministic functions that recognize a known public company in the
owner's free-text ask and resolve it to a ticker. Do NOT attempt intent classification — a request that
mentions no company from the small known-company dictionary must be rejected the same honest way whether
it is off-topic or just an unlisted company. Include at least one well-known but PRIVATELY HELD company in
the dictionary (no ticker) so that path gets a specific, honest rejection rather than a generic one. Every
function must be typed (inputs and return) and scoped to this node; call an external AI tool ONLY if a step
truly needs generation (none needed here).`;
