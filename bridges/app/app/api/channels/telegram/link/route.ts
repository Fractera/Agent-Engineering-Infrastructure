import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

const CHANNELS_URL = process.env.CHANNELS_URL ?? "http://127.0.0.1:3500";

// Linking, in two calls. POST starts it and hands back a deep link carrying a
// one-time code; GET ?code= asks whether that exact code has arrived at the bot.
// The chat id is read from the very message that carries the code, which is why
// the link is precise instead of a guess.
export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const r = await fetch(`${CHANNELS_URL}/telegram/link/start`, { method: "POST", signal: AbortSignal.timeout(15000) });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: `Channels service unreachable: ${String((e as Error).message ?? e)}` }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const code = req.nextUrl.searchParams.get("code") ?? "";
  try {
    const r = await fetch(`${CHANNELS_URL}/telegram/link/poll?code=${encodeURIComponent(code)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const data = await r.json().catch(() => ({}));
    return NextResponse.json(data, { status: r.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "waiting" }, { headers: { "Cache-Control": "no-store" } });
  }
}
