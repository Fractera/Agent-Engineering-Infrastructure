import { NextRequest, NextResponse } from "next/server";

const RAG_URL = process.env.LIGHTRAG_URL ?? "http://localhost:9621";
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${RAG_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": RAG_KEY,
      },
      body: JSON.stringify({ query: body.query, mode: body.mode ?? "hybrid" }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return NextResponse.json({ available: false, error: `LightRAG ${res.status}` }, { status: 502 });
    const data = await res.json();
    return NextResponse.json({ available: true, ...data });
  } catch {
    return NextResponse.json({ available: false }, { status: 503 });
  }
}
