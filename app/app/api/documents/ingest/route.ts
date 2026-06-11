import { NextRequest, NextResponse } from "next/server"
import { ingestDocument } from "@/lib/crud-docs/ingest"

// Activate a document — send it into Company Memory (LightRAG) so every agent can
// recall it. POST { path }. Best-effort: returns a clear message if LightRAG is not
// configured/reachable (it needs an embedding key to index).
export async function POST(req: NextRequest) {
  const { path } = await req.json()
  if (!path) return NextResponse.json({ ok: false, message: "No document selected" }, { status: 400 })
  const result = await ingestDocument(String(path))
  return NextResponse.json(result, { status: result.ok ? 200 : 502 })
}
