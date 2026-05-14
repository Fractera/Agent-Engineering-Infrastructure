import { NextRequest, NextResponse } from "next/server";

const RAG_URL = process.env.LIGHTRAG_URL ?? "http://localhost:9621";
const RAG_KEY = process.env.LIGHTRAG_API_KEY ?? "";

export async function GET(_req: NextRequest) {
  try {
    const res = await fetch(`${RAG_URL}/health`, {
      headers: { "X-API-Key": RAG_KEY },
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return NextResponse.json({ available: true, ...data });
  } catch {
    return NextResponse.json({ available: false });
  }
}
