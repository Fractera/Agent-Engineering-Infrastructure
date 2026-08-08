import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

// A thin pass-through to the deploy history kept by the data layer. The secret stays on this side —
// the browser never learns it, exactly like the vector search route next door.
const DATA_URL    = process.env.NEXT_PUBLIC_MEDIA_URL ?? "http://localhost:3300";
const DATA_SECRET = process.env.DATA_SECRET ?? "";

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id    = req.nextUrl.searchParams.get("id");
  const limit = req.nextUrl.searchParams.get("limit") ?? "50";
  const path  = id ? `/deploy-runs/${encodeURIComponent(id)}` : `/deploy-runs?limit=${encodeURIComponent(limit)}`;

  try {
    const res  = await fetch(`${DATA_URL}${path}`, { headers: { "x-data-secret": DATA_SECRET } });
    const body = await res.json();
    return NextResponse.json(body, { status: res.status });
  } catch (e) {
    // Loud: an unreachable data layer is a real fault, and an empty list would read as "no deploys yet".
    return NextResponse.json({ error: `Data layer unreachable: ${String(e)}` }, { status: 502 });
  }
}
