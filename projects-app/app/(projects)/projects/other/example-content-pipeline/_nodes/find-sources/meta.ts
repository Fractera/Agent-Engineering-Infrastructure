import type { NodeMeta } from "../../../../_shared/node-contract";

// Node "find-sources" — co-located (step 223.C.2). Its functions live ONLY in this folder; delete the
// project and they vanish with zero technical debt (README §5 co-location invariant).
export const META: NodeMeta = {
  id: "find-sources",
  cuid: "cxa1findsources0baselinev1",
  name: "Find sources",
  description: "Collects and de-duplicates source material for the article topic.",
  in: { topic: "string", count: "number" },
  out: { sources: "Source[]" },
  conditions: ["topic is non-empty"],
  run: "parallel",
  estDurationMs: 120000,
};
