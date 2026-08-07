import { NextRequest, NextResponse } from "next/server";

const RAG_URL = process.env.LIGHTRAG_URL ?? "http://localhost:9621";
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";

// What is actually in the knowledge base. (step 500) Added because the obvious
// question — "how many documents do you have?" — is one a RAG system CANNOT
// answer: it retrieves passages similar to the question, and no passage says how
// many documents exist. Asking the model returns an honest "I don't know", which
// reads like a malfunction. The corpus knows, so the panel asks the corpus.
export async function GET(_req: NextRequest) {
  try {
    const res = await fetch(`${RAG_URL}/documents`, {
      headers: { "X-API-Key": RAG_KEY },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ available: false });
    const data = await res.json();
    const buckets: Record<string, { id: string; file_path?: string; content_summary?: string; status?: string; chunks_count?: number }[]> =
      data?.statuses ?? {};
    const documents = Object.entries(buckets).flatMap(([status, rows]) =>
      (rows ?? []).map((d) => ({
        id: d.id,
        status: d.status ?? status,
        source: d.file_path && d.file_path !== "unknown_source" ? d.file_path : null,
        summary: (d.content_summary ?? "").slice(0, 120),
        chunks: d.chunks_count ?? 0,
      })),
    );
    return NextResponse.json({ available: true, total: documents.length, documents });
  } catch {
    return NextResponse.json({ available: false });
  }
}
