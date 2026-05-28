import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  // Allow this auth page to be embedded as an iframe by:
  //  - same origin (self)
  //  - any fractera.ai subdomain over HTTPS (legacy 4th-level)
  //  - any host on the local *.fractera.local dev domain
  //  - any host that shares this auth host's hostname (IP-mode: admin on
  //    :3002, app on :3000 — all same host, different ports). We can't
  //    enumerate ports in CSP, so we widen to the request host itself.
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const hostname = host.split(":")[0];
  const sameHostHttp  = hostname ? `http://${hostname}:* http://${hostname}` : "";
  const sameHostHttps = hostname ? `https://${hostname}:* https://${hostname}` : "";
  res.headers.set(
    "Content-Security-Policy",
    [
      "frame-ancestors 'self'",
      sameHostHttp,
      sameHostHttps,
      "https://*.fractera.ai",
      "http://*.fractera.local:3000",
      "http://*.fractera.local:3002",
    ].filter(Boolean).join(" ")
  );
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
