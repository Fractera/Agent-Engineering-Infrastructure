import { NextRequest, NextResponse } from "next/server";

// Auth service serves /api/session at root (no Next.js basePath).
// Path-based deploys route customer-facing /auth/* via nginx rewrite.
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";
const AUTH_REGISTER  = process.env.NEXT_PUBLIC_AUTH_URL
  ? `${process.env.NEXT_PUBLIC_AUTH_URL}/register`
  : "http://auth.partner.fractera.local:3001/register";

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
    const registerUrl = new URL(AUTH_REGISTER);
    registerUrl.searchParams.set("callbackUrl", publicCallbackUrl(req));
    return NextResponse.redirect(registerUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
