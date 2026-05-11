import { NextRequest, NextResponse } from "next/server";

const AUTH_SERVICE   = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";
const AUTH_REGISTER  = process.env.NEXT_PUBLIC_AUTH_URL
  ? `${process.env.NEXT_PUBLIC_AUTH_URL}/register`
  : "http://auth.partner.fractera.local:3001/register";

export async function proxy(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";

  let ok = false;
  try {
    const res = await fetch(`${AUTH_SERVICE}/api/session`, {
      headers: { cookie },
      signal: AbortSignal.timeout(3000),
    });
    ok = res.ok;
  } catch {
    ok = false;
  }

  if (!ok) {
    const registerUrl = new URL(AUTH_REGISTER);
    // Reconstruct the public URL from forwarded headers (Nginx sets these)
    const host  = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const pathname = new URL(req.url).pathname;
    const callbackUrl = host ? `${proto}://${host}${pathname}` : req.url;
    registerUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(registerUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
