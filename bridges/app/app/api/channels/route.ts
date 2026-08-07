import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

const CHANNELS_URL = process.env.CHANNELS_URL ?? "http://127.0.0.1:3500";

// Communication channels — the admin never touches Telegram directly. The
// channels service is the single reader of the bot (see services/channels), so
// every call here is a proxy to it over loopback.
export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const r = await fetch(`${CHANNELS_URL}/status`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!r.ok) return NextResponse.json({ available: false }, { headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ available: true, ...(await r.json()) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ available: false }, { headers: { "Cache-Control": "no-store" } });
  }
}
