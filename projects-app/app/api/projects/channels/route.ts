import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { readLiveChannels } from "@/lib/live-channels";

// GET /api/projects/channels?automation=<cat/slug> (263.1 round 7) — the LIVE declared input channels,
// read from _data/channels.ts on disk. The Settings modal and the missing-keys funnel refresh from
// here so a channel the coding agent declared MID-DEVELOPMENT shows its key fields immediately,
// without waiting for the next full rebuild (the build-time prop stays as the SSR seed).
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  const channels = await readLiveChannels(proj.projectDir);
  return NextResponse.json({ ok: true, channels });
}
