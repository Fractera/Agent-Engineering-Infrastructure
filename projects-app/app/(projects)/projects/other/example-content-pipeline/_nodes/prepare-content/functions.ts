import type { NodeFunction } from "../../../../_shared/node-contract";
import { callExternalAi } from "../../../../_shared/external-ai";
import type { Source } from "../find-sources/functions";

// REAL functions of "prepare-content" (bodies added in step 241 — the general node executor's proof).
// `buildStructure` is plain deterministic application code; `draftArticle` is the ONE place generation is
// genuinely needed, so it is an EXPLICIT external AI tool-call — the only use of AI the contract allows,
// never the app "thinking for itself". The FUNCTIONS[] metadata below is unchanged: it stays the agent /
// Builder cross-reference by name, and its `externalAi.systemInstruction` is the instruction ACTUALLY sent at
// runtime (read from here, never a second copy that could drift).
export type Outline = { heading: string; sourceIds: string[] }[];
export type Article = { title: string; sections: { heading: string; html: string; sourceIds: string[] }[] };

/** Deterministic: an intro plus one section per source, in order — the structure the writer must follow. */
export async function buildStructure(topic: string, sources: Source[]): Promise<Outline> {
  const outline: Outline = [{ heading: `What ${topic} is`, sourceIds: sources.map((s) => s.url) }];
  for (const s of sources) outline.push({ heading: s.title, sourceIds: [s.url] });
  return outline;
}

/** The ONLY AI call of this automation — explicit, external, using the instruction declared below. */
export async function draftArticle(outline: Outline, sources: Source[]): Promise<Article> {
  const system = FUNCTIONS.find((f) => f.name === "draftArticle")?.externalAi?.systemInstruction ?? "";
  const raw = await callExternalAi(system, `OUTLINE:\n${JSON.stringify(outline)}\n\nSOURCES:\n${JSON.stringify(sources)}`);
  const parsed = JSON.parse(raw) as Partial<Article>;
  // The declared resultMapping, enforced: the AI's sourceIds are VALIDATED against the real inputs, so an
  // invented source can never leave this function.
  const known = new Set(sources.map((s) => s.url));
  return {
    title: String(parsed.title ?? "").trim() || "Untitled",
    sections: (parsed.sections ?? []).map((s) => ({
      heading: String(s.heading ?? ""),
      html: String(s.html ?? ""),
      sourceIds: (s.sourceIds ?? []).filter((id) => known.has(id)),
    })),
  };
}

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
