import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

// Step 500 — the admin's read-only window into the vector warehouse. It forwards a
// meaning-search to the data service (:3300), which owns the vectors, the embedding
// call and the key. The admin never holds the key itself; it only carries the
// service secret so the call is authorised.
const DATA_URL = process.env.DATA_INTERNAL_URL ?? "http://127.0.0.1:3300";

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) return NextResponse.json({ error: "query is required" }, { status: 400 });

  try {
    const r = await fetch(`${DATA_URL}/vectors/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-data-secret": process.env.DATA_SECRET ?? "",
      },
      body: JSON.stringify({ query, k: Number(body?.k) || 5 }),
    });
    const data = await r.json().catch(() => ({ error: "bad response" }));
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
