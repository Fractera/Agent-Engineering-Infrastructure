import type { NodeMeta } from "../../../../_shared/node-contract";

// Node "prepare-content" — co-located (step 223.C.2).
export const META: NodeMeta = {
  id: "prepare-content",
  cuid: "cxa2preparecontent0basev1",
  name: "Prepare content",
  description: "Builds the semantic structure and drafts the article from the sources.",
  in: { topic: "string", sources: "Source[]" },
  out: { article: "Article" },
  conditions: ["at least one source was found"],
  run: "sequential",
  estDurationMs: 15000,
};
