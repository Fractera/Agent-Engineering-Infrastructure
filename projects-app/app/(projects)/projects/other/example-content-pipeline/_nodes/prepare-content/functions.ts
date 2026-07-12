import type { NodeFunction } from "../../../../_shared/node-contract";

// Deterministic functions of "prepare-content" (step 223.C.2). `draftArticle` is where generation is
// genuinely needed → it is declared as an EXPLICIT external AI tool-call step, not the app "thinking".
export const FUNCTIONS: NodeFunction[] = [
  {
    name: "buildStructure",
    paramsIn: { topic: "string", sources: "Source[]" },
    returns: "Outline",
    rules: ["deterministic; no AI inside the app"],
  },
  {
    name: "draftArticle",
    paramsIn: { outline: "Outline", sources: "Source[]" },
    returns: "Article",
    rules: ["calls an EXTERNAL AI tool explicitly (generation) — not app-internal AI"],
  },
];
