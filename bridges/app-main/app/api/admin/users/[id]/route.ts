import { NextRequest, NextResponse } from "next/server";

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";

async function proxy(req: NextRequest, method: string, id: string) {
  const cookie = req.headers.get("cookie") ?? "";
  const upstream = `${AUTH_SERVICE}/api/admin/users/${id}`;

  try {
    const body = method !== "DELETE" ? await req.text() : undefined;
    const res = await fetch(upstream, {
      method,
      headers: {
        cookie,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Auth service unavailable" }, { status: 503 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxy(req, "PATCH", id);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxy(req, "DELETE", id);
}
