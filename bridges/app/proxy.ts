import { NextRequest, NextResponse } from "next/server";
import { shouldBypassAuth } from "@/lib/auth-bypass";

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";

// Service subdomain prefixes — used to recover the apex from a service host
// (admin.aifa.dev → aifa.dev) when building the auth URL in domain/Secure mode.
const KNOWN_PREFIXES = ["www", "auth", "admin", "data", "hermes", "lightrag"];

// Public base URL of the Auth service as the BROWSER must reach it.
// - IP / localhost (demo): same host, port 3001 (http://<ip>:3001).
// - Domain / Secure mode: sibling subdomain on standard 443, NO port
//   (https://auth.<apex>). Building `<hostname>:3001` on a domain produced
//   `https://admin.<domain>:3001` → ERR_SSL_PROTOCOL_ERROR (3001 has no TLS).
function publicAuthBase(req: NextRequest): string {
  const host  = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3002";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const hostname = host.split(":")[0];
  const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname === "localhost";
  if (isIp) return `${proto}://${hostname}:3001`;
  const labels = hostname.split(".");
  const apex = KNOWN_PREFIXES.includes(labels[0]) ? labels.slice(1).join(".") : hostname;
  return `${proto}://auth.${apex}`;
}

function publicCallbackUrl(req: NextRequest): string {
  const host  = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const pathname = new URL(req.url).pathname;
  // With basePath=/admin, req.url already includes /admin in pathname.
  return host ? `${proto}://${host}${pathname}` : req.url;
}

export async function proxy(req: NextRequest) {
  if (shouldBypassAuth()) {
    return NextResponse.next();
  }

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
    const registerUrl = new URL(`${publicAuthBase(req)}/register`);
    registerUrl.searchParams.set("callbackUrl", publicCallbackUrl(req));
    return NextResponse.redirect(registerUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
