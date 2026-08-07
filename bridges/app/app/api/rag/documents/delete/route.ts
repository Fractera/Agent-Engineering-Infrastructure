import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

const RAG_URL = process.env.LIGHTRAG_URL ?? "http://localhost:9621";
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";

// Removing knowledge. Two shapes, both destructive and therefore both behind an
// explicit confirmation in the panel:
//   { ids: [...] } — drop those documents, their chunks, entities and relations
//   { all: true }  — empty the base
//
// Deleting costs more than it looks: the entities and relations extracted from a
// document go with it, and getting them back means another pass of the model over
// every chunk. That is why the UI asks first.
export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
  const all = body?.all === true;
  if (!all && ids.length === 0) {
    return NextResponse.json({ error: "Send { ids: [...] } or { all: true }" }, { status: 400 });
  }

  try {
    const res = all
      ? await fetch(`${RAG_URL}/documents`, {
          method: "DELETE",
          headers: { "X-API-Key": RAG_KEY },
          signal: AbortSignal.timeout(120000),
        })
      : await fetch(`${RAG_URL}/documents/delete_document`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", "X-API-Key": RAG_KEY },
          body: JSON.stringify({ doc_ids: ids, delete_file: false }),
          signal: AbortSignal.timeout(120000),
        });
    const text = await res.text();
    if (!res.ok) return NextResponse.json({ error: `LightRAG ${res.status}: ${text.slice(0, 300)}` }, { status: 502 });
    // Deletion is queued the same way ingestion is — report that honestly rather
    // than implying the graph is already clean.
    return NextResponse.json({ ok: true, detail: text.slice(0, 300) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message ?? e) }, { status: 503 });
  }
}
