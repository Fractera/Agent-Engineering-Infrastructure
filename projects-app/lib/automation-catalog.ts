import { db } from "@/lib/db";

// THE AUTOMATION CATALOG (owner 2026-07-18, the reuse thesis, step 258 phase 2) — the vector index that makes
// every automation FINDABLE BY MEANING. The product ships with tens→hundreds→a thousand ready automations; a
// new owner must be able to describe what he needs in words and be shown the ones that fit, instead of
// building from scratch.
//
// THE SOURCE OF THE EMBEDDING is the "How it works" text — the already-high-quality, AI-written plain-language
// description of an automation (lib/how-it-works.ts). We reuse that artefact rather than authoring a second
// one: whenever it is (re)generated, its text is (re)ingested here with the automation's id stitched into the
// document, so a vector query returns the automation, not just prose.
//
// SELF-SUFFICIENCY: this leans on the SAME LightRAG service telegram-notes already uses (the notes bot's
// _workflow/definition.ts). It is best-effort throughout — a server with no LightRAG (a Codex-only project,
// CLAUDE.md self-sufficiency doctrine) simply has no catalog; nothing else breaks.

const RAG_URL = (process.env.LIGHTRAG_URL ?? "http://localhost:9621").replace(/\/+$/, "");
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";
// One SHARED space for the whole catalog (NOT per-automation like the notes bot's per-slug identity): the
// search must range over every automation at once.
const CATALOG_IDENTITY = "automation-catalog";
// The marker we stitch into every doc so a /query context can be parsed back to the automation it came from.
// LightRAG's /query returns synthesized PROSE, not ids — so with only_need_context we read the raw chunks and
// pull these lines out.
const ID_MARKER = "AUTOMATION_ID:";

/** POST one catalog document (id-stitched "How it works" text) to LightRAG. Returns the track id, or null on
 *  any failure (best-effort — the caller stores whatever it gets and never throws). */
export async function catalogIngest(automation: string, title: string, text: string): Promise<string | null> {
  const doc = `${ID_MARKER} ${automation}\nAUTOMATION_NAME: ${title}\n\n${text}`.trim();
  try {
    const r = await fetch(`${RAG_URL}/documents/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": RAG_KEY, "X-Agent-Identity": CATALOG_IDENTITY },
      body: JSON.stringify({ text: doc }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { track_id?: string };
    return data.track_id ?? null;
  } catch { return null; }
}

/** Remove a catalog document by its track id (the doc ids under a track). Best-effort — mirror of the notes
 *  bot's deleteVectorDoc: a re-index deletes the OLD doc first so the catalog never accumulates stale prose. */
export async function catalogDelete(trackId: string): Promise<void> {
  if (!trackId) return;
  try {
    const st = await fetch(`${RAG_URL}/documents/track_status/${encodeURIComponent(trackId)}`, {
      headers: { "X-API-Key": RAG_KEY }, signal: AbortSignal.timeout(15_000),
    });
    if (!st.ok) return;
    const data = (await st.json()) as { documents?: { id?: string }[] };
    const docIds = (data.documents ?? []).map((d) => d.id).filter((x): x is string => !!x);
    if (!docIds.length) return;
    await fetch(`${RAG_URL}/documents/delete_document`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "X-API-Key": RAG_KEY },
      body: JSON.stringify({ doc_ids: docIds }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch { /* best-effort */ }
}

// ── the track-id store (which vector doc belongs to which automation) ─────────────────────────────────────
// A tiny table so a re-index can delete the automation's PREVIOUS doc, and delete/clone can forget it.

export async function getCatalogTrack(automation: string): Promise<string | null> {
  try {
    const row = (await db.prepare(
      `SELECT track_id FROM automation_catalog_index WHERE automation = ?`,
    ).get(automation)) as { track_id?: string } | null;
    return row?.track_id ?? null;
  } catch { return null; }
}

export async function setCatalogTrack(automation: string, trackId: string): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO automation_catalog_index (automation, track_id, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(automation) DO UPDATE SET track_id = excluded.track_id, updated_at = datetime('now')`,
    ).run(automation, trackId);
  } catch { /* table absent on an older DB — the catalog is simply unavailable */ }
}

export async function clearCatalogTrack(automation: string): Promise<void> {
  try {
    await db.prepare(`DELETE FROM automation_catalog_index WHERE automation = ?`).run(automation);
  } catch { /* nothing to clear */ }
}

/** THE ONE-CALL RE-INDEX used by the "How it works" generator and any backfill: delete the automation's old
 *  vector doc, ingest the fresh text, persist the new track id. Best-effort end to end. */
export async function reindexAutomation(automation: string, title: string, text: string): Promise<void> {
  if (!text.trim()) return;
  const prev = await getCatalogTrack(automation);
  if (prev) await catalogDelete(prev);
  const trackId = await catalogIngest(automation, title, text);
  if (trackId) await setCatalogTrack(automation, trackId);
  else await clearCatalogTrack(automation);
}

// ── search ────────────────────────────────────────────────────────────────────────────────────────────────

export type CatalogHit = { automation: string; snippet: string };

/** Query the catalog for automations matching a free-text description. Uses only_need_context so LightRAG
 *  returns the raw matched chunks (not a synthesized answer); we parse the stitched AUTOMATION_ID lines out,
 *  de-dupe preserving order (best match first), and return the id + a short snippet each. */
export async function catalogQuery(query: string, topK = 8): Promise<CatalogHit[]> {
  const q = query.trim();
  if (!q) return [];
  let context = "";
  try {
    const r = await fetch(`${RAG_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": RAG_KEY, "X-Agent-Identity": CATALOG_IDENTITY },
      body: JSON.stringify({ query: q, mode: "hybrid", only_need_context: true, top_k: topK }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!r.ok) return [];
    const data = (await r.json()) as { response?: string; data?: unknown };
    context = typeof data.response === "string" ? data.response : JSON.stringify(data.data ?? "");
  } catch { return []; }

  // Pull each "AUTOMATION_ID: <cat/slug>" occurrence + a little of the text that follows it as the snippet.
  const hits: CatalogHit[] = [];
  const seen = new Set<string>();
  const re = new RegExp(`${ID_MARKER}\\s*([a-z0-9-]+/[a-z0-9-]+)([\\s\\S]{0,240})`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(context)) !== null) {
    const automation = m[1];
    if (seen.has(automation)) continue;
    seen.add(automation);
    const snippet = m[2].replace(/AUTOMATION_NAME:.*/i, "").replace(/\s+/g, " ").trim().slice(0, 160);
    hits.push({ automation, snippet });
    if (hits.length >= topK) break;
  }
  return hits;
}
