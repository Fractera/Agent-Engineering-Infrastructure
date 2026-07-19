// THE VECTOR-MEMORY PRIMITIVE (step 260, owner 2026-07-19) — the ONE place the product writes into the
// LightRAG vector store, and it always carries PROVENANCE: every ingested entity is tagged with its project
// address as the LightRAG `file_source`, instead of the anonymous "unknown_source" every record showed before.
//
// THE PROVENANCE IS AN EXTENSIBLE URI (owner's refinement 2026-07-19):
//   base (always present, the stable anchor):  projects/<category>/<slug>
//   optional facets (only when they apply), as sorted query params:  ?channel=telegram&kind=note&node=…&instance=…
// Not every memory has a channel (the catalog "How it works" doc has none → it stays base-only), so facets are
// NEVER baked into the path — they ride as OPTIONAL query params. The automation address stays the single
// stable identity; facets extend it for step 226 (fork / instance / event / node) with no redesign. Keys are
// sorted so the same logical source is a stable string across calls.
//
// SELF-SUFFICIENCY: best-effort throughout. No LightRAG on this server (a Codex-only project) → every call is
// a silent no-op; it must NEVER throw into a product flow. Mirrors the proven contract of the catalog and the
// notes bot (POST /documents/text → { track_id }); the only addition is the `file_source` provenance field.

// Bare "fs"/"path" specifiers on purpose (not the "node:" prefix): telegram-notes' WDK workflow imports this
// module through ingestToMemory, and the workflow compiler REJECTS "node:"-prefixed imports while accepting
// the bare form — the same convention @/lib/db uses to run fs inside workflow steps (definition.ts, 207.16).
import { promises as fsp } from "fs";
import { join } from "path";

const RAG_URL = (process.env.LIGHTRAG_URL ?? "http://localhost:9621").replace(/\/+$/, "");
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";

export type IngestOptions = {
  /** The automation address "<category>/<slug>" — the base provenance `projects/<category>/<slug>`. */
  automation: string;
  /** The text to remember (an answer, a result, an event). Empty → no-op. */
  text: string;
  /** Optional facets appended as sorted query params — only those that apply (e.g. { channel: "telegram" }).
   *  Empty values are dropped. A memory with no channel simply omits it — never a baked-in path segment. */
  facets?: Record<string, string | undefined>;
  /** LightRAG workspace identity. Defaults to the automation address, so each automation's memory is its own
   *  space (same convention the notes bot uses with its slug). */
  identity?: string;
  /** Override the whole provenance source. Defaults to the base + facets built below. */
  fileSource?: string;
};

/** AUTO-DETECT THE INPUT CHANNEL of an automation (step 261 follow-up, owner 2026-07-19) — so a memory born
 *  from the frozen template stamps the channel it actually came in through, with no per-node wiring. The
 *  channel is an INPUT node's ioType (role:"input" → ioType is the channel/surface key, e.g. "telegram",
 *  "control-panel"). Returns it only when the automation has EXACTLY ONE input surface; 0 or several (an
 *  ambiguous multi-channel automation) → undefined, so provenance stays base rather than guessing. Best-effort,
 *  file-read: any failure → undefined. */
export async function detectChannel(automation: string): Promise<string | undefined> {
  try {
    const [category, slug] = automation.split("/");
    if (!category || !slug) return undefined;
    const nodesDir = join(process.cwd(), "app", "(projects)", "projects", category, slug, "_nodes");
    const entries = await fsp.readdir(nodesDir, { withFileTypes: true });
    const channels = new Set<string>();
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const meta = await fsp.readFile(join(nodesDir, e.name, "meta.ts"), "utf8").catch(() => "");
      if ((meta.match(/role:\s*["']([^"']+)["']/)?.[1]) !== "input") continue;
      const ioType = meta.match(/ioType:\s*["']([^"']+)["']/)?.[1];
      if (ioType) channels.add(ioType);
    }
    return channels.size === 1 ? [...channels][0] : undefined;
  } catch { return undefined; }
}

/** Build the extensible provenance URI: `projects/<automation>` + sorted `?facet=value` for the facets that
 *  actually apply. Deterministic (keys sorted) so the same logical source is a stable string. */
export function memorySource(automation: string, facets?: Record<string, string | undefined>): string {
  const base = `projects/${automation}`;
  const entries = Object.entries(facets ?? {})
    .filter((e): e is [string, string] => typeof e[1] === "string" && e[1].trim() !== "")
    .sort((a, b) => a[0].localeCompare(b[0]));
  if (!entries.length) return base;
  const qs = entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  return `${base}?${qs}`;
}

type RagDoc = { id?: string; file_path?: string };

/** List every catalog/memory doc whose provenance belongs to this automation — its base source
 *  `projects/<automation>` OR any facet variant `projects/<automation>?…`. Reads the GLOBAL /documents list
 *  (not identity-scoped — proven in step 258: one list spans every workspace) and filters by `file_path`
 *  (the provenance field). Best-effort → [] on any failure. */
export async function listMemoryBySource(automation: string): Promise<RagDoc[]> {
  const base = `projects/${automation}`;
  try {
    const r = await fetch(`${RAG_URL}/documents`, {
      headers: { "X-API-Key": RAG_KEY }, signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return [];
    const data = (await r.json()) as { statuses?: Record<string, RagDoc[]> };
    const all = Object.values(data.statuses ?? {}).flat();
    return all.filter((d) => {
      const src = d.file_path ?? "";
      return src === base || src.startsWith(`${base}?`);
    });
  } catch { return []; }
}

/** PURGE every vector-memory doc of one automation — the lifecycle mutation behind DELETE (step 261): a
 *  deleted automation must leave no memory behind (its notes, finance rows, output-node results AND its
 *  catalog doc — all carry `projects/<automation>` provenance). Deletion is by doc id and is NOT
 *  identity-scoped (same contract the notes bot's deleteVectorDoc uses in production). Best-effort — never
 *  throws; returns how many docs were removed. */
export async function purgeMemoryBySource(automation: string): Promise<number> {
  const docs = await listMemoryBySource(automation);
  const ids = docs.map((d) => d.id).filter((x): x is string => !!x);
  if (!ids.length) return 0;
  try {
    await fetch(`${RAG_URL}/documents/delete_document`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "X-API-Key": RAG_KEY },
      body: JSON.stringify({ doc_ids: ids }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch { /* best-effort — the automation is being deleted regardless */ }
  return ids.length;
}

/** Write one document to vector memory, tagged with its project-address provenance. Returns the LightRAG
 *  track id (or null on any failure / when there is nothing to store). Best-effort — never throws. */
export async function ingestToMemory(opts: IngestOptions): Promise<string | null> {
  const text = (opts.text ?? "").trim();
  if (!text) return null;
  // AUTO-CHANNEL (step 261 follow-up): when the caller did not specify a channel (the frozen template's
  // output node doesn't — it can't know it at authoring time) and did not override the whole source, stamp
  // the automation's detected input channel. An explicit channel (e.g. the notes bot's "telegram") is never
  // overridden; a full fileSource override skips detection entirely.
  const facets = { ...(opts.facets ?? {}) };
  if (opts.fileSource === undefined && facets.channel === undefined) {
    const ch = await detectChannel(opts.automation);
    if (ch) facets.channel = ch;
  }
  const fileSource = opts.fileSource ?? memorySource(opts.automation, facets);
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
