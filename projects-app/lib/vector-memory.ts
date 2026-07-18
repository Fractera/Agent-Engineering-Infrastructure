// THE VECTOR-MEMORY PRIMITIVE (step 260, owner 2026-07-19) — the ONE place the product writes into the
// LightRAG vector store, and it always carries PROVENANCE: every ingested entity is tagged with its project
// address `projects/<category>/<slug>` as the LightRAG `file_source`, instead of the anonymous
// "unknown_source" every record showed before. That address is the same identifier the rest of the product
// uses (the automation's URL), so a memory document can always be traced back to the automation that wrote
// it — the prerequisite for the structured graph memory of step 226 (nodes/edges per automation/fork/event).
//
// SELF-SUFFICIENCY: best-effort throughout. No LightRAG on this server (a Codex-only project) → every call is
// a silent no-op; it must NEVER throw into a product flow. Mirrors the proven contract of the catalog and the
// notes bot (POST /documents/text → { track_id }); the only addition is the `file_source` provenance field.

const RAG_URL = (process.env.LIGHTRAG_URL ?? "http://localhost:9621").replace(/\/+$/, "");
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";

export type IngestOptions = {
  /** The automation address "<category>/<slug>" — becomes the provenance `projects/<category>/<slug>`. */
  automation: string;
  /** The text to remember (an answer, a result, an event). Empty → no-op. */
  text: string;
  /** LightRAG workspace identity. Defaults to the automation address, so each automation's memory is its own
   *  space (same convention the notes bot uses with its slug). */
  identity?: string;
  /** Override the provenance source. Defaults to `projects/<automation>`. */
  fileSource?: string;
};

/** Write one document to vector memory, tagged with its project-address provenance. Returns the LightRAG
 *  track id (or null on any failure / when there is nothing to store). Best-effort — never throws. */
export async function ingestToMemory(opts: IngestOptions): Promise<string | null> {
  const text = (opts.text ?? "").trim();
  if (!text) return null;
  const fileSource = opts.fileSource ?? `projects/${opts.automation}`;
  const identity = opts.identity ?? opts.automation;
  try {
    const r = await fetch(`${RAG_URL}/documents/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": RAG_KEY, "X-Agent-Identity": identity },
      // `file_source` is the provenance (verified against LightRAG /openapi.json) — the project address, so
      // the document is never "unknown_source" again.
      body: JSON.stringify({ text, file_source: fileSource }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { track_id?: string };
    return data.track_id ?? null;
  } catch { return null; }
}
