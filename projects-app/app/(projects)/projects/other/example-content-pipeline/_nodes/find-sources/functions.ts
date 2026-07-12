import type { NodeFunction } from "../../../../_shared/node-contract";

// Deterministic application functions of "find-sources" (typed contracts; step 223.C.2). The AI is not
// allowed inside the application — a step that genuinely needs generation calls an external AI tool
// explicitly (none here). Implementations land in the execution slice (223.C.6).
export const FUNCTIONS: NodeFunction[] = [
  {
    name: "searchSources",
    paramsIn: { topic: "string", count: "number" },
    returns: "Source[]",
    rules: ["deterministic; no AI inside the app", "respects `count`"],
  },
  {
    name: "dedupeSources",
    paramsIn: { sources: "Source[]" },
    returns: "Source[]",
  },
];
