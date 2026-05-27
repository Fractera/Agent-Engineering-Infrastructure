import { NextRequest, NextResponse } from "next/server";

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";

function publicCallbackUrl(req: NextRequest): string {
  const host  = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const pathname = new URL(req.url).pathname;
  // With basePath=/admin, req.url already includes /admin in pathname.
  return host ? `${proto}://${host}${pathname}` : req.url;
}

export async function proxy(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";

  let isAdmin = false;
  try {
    const res = await fetch(`${AUTH_SERVICE}/api/session`, {
      headers: { cookie },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json() as { roles?: string[] };
      isAdmin = (data.roles ?? []).includes("admin");
    }
  } catch {
    isAdmin = false;
  }

  if (!isAdmin) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3002";
    const proto = req.headers.get("x-forwarded-proto") || "http";
    const hostname = host.split(":")[0];
    const registerUrl = new URL(`${proto}://${hostname}:3001/register`);
    registerUrl.searchParams.set("callbackUrl", publicCallbackUrl(req));
    return NextResponse.redirect(registerUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
