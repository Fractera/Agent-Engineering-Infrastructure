import { NextRequest, NextResponse } from "next/server";
import fs from "fs";

const RAG_URL = process.env.LIGHTRAG_URL ?? "http://localhost:9621";
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";

const DOC_PATHS = [
  "/opt/fractera/CLAUDE.md",
  "/opt/fractera/docs/architecture.md",
  "/opt/fractera/docs/glossary.md",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (body?.text) {
      const res = await fetch(`${RAG_URL}/documents/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": RAG_KEY },
        body: JSON.stringify({ text: body.text, description: body.description ?? "" }),
        signal: AbortSignal.timeout(120000),
      });
      if (!res.ok) return NextResponse.json({ available: false, error: `LightRAG ${res.status}` }, { status: 502 });
      return NextResponse.json(await res.json());
    }

    const results: { path: string; ok: boolean }[] = [];
    for (const docPath of DOC_PATHS) {
      if (!fs.existsSync(docPath)) continue;
      const text = fs.readFileSync(docPath, "utf-8");
      const res = await fetch(`${RAG_URL}/documents/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": RAG_KEY },
        body: JSON.stringify({ text, description: docPath }),
        signal: AbortSignal.timeout(120000),
      });
      results.push({ path: docPath, ok: res.ok });
    }
    return NextResponse.json({ inserted: results });
  } catch {
    return NextResponse.json({ available: false }, { status: 503 });
  }
}
