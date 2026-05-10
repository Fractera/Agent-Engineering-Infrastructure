import { NextRequest, NextResponse } from "next/server";

const AUTH_SERVICE  = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";
const AUTH_REGISTER = process.env.NEXT_PUBLIC_AUTH_URL
  ? `${process.env.NEXT_PUBLIC_AUTH_URL}/register`
  : "http://auth.partner.fractera.local:3001/register";

export async function middleware(req: NextRequest) {
  let ok = false;
  try {
    const res = await fetch(`${AUTH_SERVICE}/api/session`, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
      signal: AbortSignal.timeout(3000),
    });
    ok = res.ok;
  } catch {
    ok = false;
  }

  if (!ok) {
    const url = new URL(AUTH_REGISTER);
    url.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
