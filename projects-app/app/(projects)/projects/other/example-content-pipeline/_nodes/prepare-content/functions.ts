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
    rules: ["the ONLY AI in this node — an explicit external call, never app-internal"],
    externalAi: {
      systemInstruction:
        "You are a technical writer. Write a complete article that follows the given OUTLINE section by " +
        "section, using ONLY facts supported by the provided SOURCES. Cite each claim to its source id. " +
        "Do not invent sources. Return strict JSON: { title: string, sections: [{ heading: string, " +
        "html: string, sourceIds: string[] }] }.",
      resultMapping:
        "The JSON is parsed into the typed Article (title + sections); sourceIds are validated against " +
        "the input sources before the node returns.",
    },
  },
];
