import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

const CHANNELS_URL = process.env.CHANNELS_URL ?? "http://127.0.0.1:3500";

// POST { token?, enabled? } — save the bot token or switch the channel on/off.
export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const r = await fetch(`${CHANNELS_URL}/telegram/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: `Channels service unreachable: ${String((e as Error).message ?? e)}` }, { status: 503 });
  }
}
