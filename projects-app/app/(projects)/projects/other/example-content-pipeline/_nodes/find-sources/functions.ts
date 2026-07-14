import type { NodeFunction } from "../../../../_shared/node-contract";

// Deterministic application functions of "find-sources" (typed contracts; step 223.C.2). The AI is not
// allowed inside the application — a step that genuinely needs generation calls an external AI tool
// explicitly (none here).
//
// REAL IMPLEMENTATION (step 238 Phase 3 — the proof that the _nodes/ standard produces genuinely executing
// code, not just typed signatures). This is the SMALLEST possible slice: a plain, deterministic, no-AI,
// no-network function body — Next.js compiles this file normally like any other server module; nothing
// here is eval'd or stored as a string. Called by app/api/projects/nodes/[cuid]/run-real/route.ts, which
// statically imports these two exports and records a REAL automation_run_nodes row from their actual
// return value (as opposed to test-run's pure timing simulation, step 227.C).
export type Source = { url: string; title: string };

// A tiny built-in fixture, not a network call — this node's own rule says "deterministic; no AI inside the
// app." Deliberately includes a same-title/different-url pair AND a same-url/different-title pair so
// dedupeSources' real behaviour (dedupe by url) is distinguishable from a no-op.
const FIXTURE_SOURCES: Source[] = [
  { url: "https://example.com/a", title: "Cats and their sleep cycles" },
  { url: "https://example.com/b", title: "Cats and their sleep cycles" },
  { url: "https://example.com/c", title: "Why cats purr" },
  { url: "https://example.com/a", title: "Cats and their sleep cycles (mirror)" },
];

/** Filters the fixture by whether `topic` appears in a source's title (case-insensitive), falling back to
 *  the full fixture when nothing matches, then caps the result at `count`. */
export async function searchSources(topic: string, count: number): Promise<Source[]> {
  const topicLower = topic.toLowerCase();
  const matched = FIXTURE_SOURCES.filter((s) => s.title.toLowerCase().includes(topicLower));
  const pool = matched.length ? matched : FIXTURE_SOURCES;
  return pool.slice(0, Math.max(0, count));
}

/** Dedupes by `url` (this node's `out: { sources: Source[] }` contract is one row per real source). */
export async function dedupeSources(sources: Source[]): Promise<Source[]> {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const s of sources) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    out.push(s);
  }
  return out;
}

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
