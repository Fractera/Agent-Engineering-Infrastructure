import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let callbackUrl: string;
  try {
    const body = await req.json();
    callbackUrl = body.callbackUrl;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!callbackUrl || typeof callbackUrl !== "string") {
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
        { status: 502 }
      );
    }
    return NextResponse.json({ ok: true, status: res.status });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
