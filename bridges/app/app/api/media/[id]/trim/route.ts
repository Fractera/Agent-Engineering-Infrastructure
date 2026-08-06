import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";

// Step 500 — the admin's door to the video trimmer. The cut itself belongs to the
// data service (:3300), which owns the stored objects and runs ffmpeg; the admin
// only authorises the request and forwards it with the service secret.
const DATA_URL = process.env.DATA_INTERNAL_URL ?? "http://127.0.0.1:3300";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);

  try {
    const r = await fetch(`${DATA_URL}/media/${encodeURIComponent(id)}/trim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-data-secret": process.env.DATA_SECRET ?? "",
      },
      body: JSON.stringify({ start: body?.start, end: body?.end }),
    });
    const data = await r.json().catch(() => ({ ok: false, error: "bad response" }));
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
