import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/nodes";

// ⚠ COPY-PAIR (263.1): the CANON lives in bridges/app/app/api/bridges/codex-auth-relay/route.ts (:3002).
// Edit them AS A PAIR. Codex's browser OAuth calls back to localhost:1455 on the SERVER — the owner's
// browser cannot reach it, so he pastes the failed callback URL here and we replay it server-side.
// One deliberate difference from the admin copy: this app's routes are role-gated (authorize).
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let callbackUrl: string;
  try {
    const body = (await req.json()) as { callbackUrl?: string };
    callbackUrl = String(body.callbackUrl ?? "");
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!callbackUrl) {
    return NextResponse.json({ error: "callbackUrl required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(callbackUrl);
  } catch {
    return NextResponse.json({ error: "invalid URL" }, { status: 400 });
  }

  if (!parsed.pathname.startsWith("/auth/callback")) {
    return NextResponse.json({ error: "invalid callback path" }, { status: 400 });
  }

  const relayUrl = `http://localhost:1455${parsed.pathname}${parsed.search}`;

  try {
    const res = await fetch(relayUrl, {
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `Relay failed (${res.status}): ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, status: res.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
