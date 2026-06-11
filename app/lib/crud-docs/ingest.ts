import { readTextForIngest } from "./fs"

// Send a document into Company Memory (LightRAG). Same contract the hermes lightrag-
// memory plugin uses: POST {LIGHTRAG_URL}/documents/text with an X-API-Key header and a
// { text, description } body (services/hermes-plugins/lightrag-memory/__init__.py).
// Best-effort: LightRAG needs an embedding/LLM key to actually index; if it is not
// reachable or not configured we report that, we do not crash.

const LIGHTRAG_URL = (process.env.LIGHTRAG_URL ?? "http://localhost:9621").replace(/\/+$/, "")
const LIGHTRAG_KEY = process.env.LIGHTRAG_API_KEY ?? ""

export type IngestResult = { ok: boolean; message: string }

export async function ingestDocument(rel: string): Promise<IngestResult> {
  const text = await readTextForIngest(rel)
  if (text == null) {
    return { ok: false, message: "This document cannot be read as text (legacy .doc). Upload a .docx / .txt / .md version to activate it." }
  }
  if (!text.trim()) {
    return { ok: false, message: "The document is empty — nothing to activate." }
  }
  if (!LIGHTRAG_KEY) {
    // No key in this app's env (older deploy before the key was plumbed). Without it
    // LightRAG returns 403; say so clearly instead of a confusing rejection.
    return { ok: false, message: "Company Memory is not wired to this app yet (no LightRAG key). Redeploy from the latest build, or set LIGHTRAG_API_KEY in the app environment." }
  }
  try {
    const res = await fetch(`${LIGHTRAG_URL}/documents/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": LIGHTRAG_KEY,
        "X-Agent-Identity": "documents-page",
      },
      body: JSON.stringify({ text, description: `crud-docs | ${rel}` }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      return { ok: false, message: `Company Memory rejected the document (HTTP ${res.status}). Make sure LightRAG has an embedding key set, then try again.` }
    }
    return { ok: true, message: "Sent to Company Memory — LightRAG is indexing it. It becomes searchable once indexing finishes." }
  } catch {
    return { ok: false, message: "Company Memory (LightRAG) is not reachable from the workspace. Enable it in Admin → Company Memory, then activate again." }
  }
}
