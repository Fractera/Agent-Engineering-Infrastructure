import { NextRequest, NextResponse } from "next/server";

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";

export async function GET(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  const url = new URL(req.url);
  const search = url.searchParams.toString();
  const upstream = `${AUTH_SERVICE}/api/admin/users${search ? `?${search}` : ""}`;

  try {
    const res = await fetch(upstream, {
      headers: { cookie },
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Auth service unavailable" }, { status: 503 });
  }
}
