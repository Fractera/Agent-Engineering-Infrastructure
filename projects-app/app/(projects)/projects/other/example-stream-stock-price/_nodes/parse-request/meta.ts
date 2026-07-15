import type { NodeMeta } from "../../../../_shared/node-contract";

// Node "parse-request" — co-located (step 243). Its functions live ONLY in this folder; delete the
// automation and they vanish with zero technical debt (README §5 co-location invariant).
export const META: NodeMeta = {
  id: "parse-request",
  cuid: "cxc1parserequest0stream1",
  name: "Parse the request",
  description: "Recognizes a known public company in the owner's free-text ask and resolves it to a ticker.",
  in: { query: "string" },
  out: { company: "string", ticker: "string" },
  conditions: ["query mentions a company from the small known-company dictionary"],
  run: "sequential",
  estDurationMs: 20,
};
