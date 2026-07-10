import { NextRequest, NextResponse } from "next/server";
import { shouldBypassAuth } from "@/lib/auth-bypass";

// Design service proxy (step 197) — architect-only, byte-for-byte the bridges/app admin gate
// (the design layer is an architect cockpit surface). /api/* excluded from the matcher; IP/demo
// mode opens it via shouldBypassAuth().
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";
const KNOWN_PREFIXES = ["www", "auth", "admin", "data", "hermes", "lightrag", "projects", "design"];

function publicAuthBase(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3004";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const hostname = host.split(":")[0];
  const isIp = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname === "localhost";
  if (isIp) return `${proto}://${hostname}:3001`;
  const labels = hostname.split(".");
  const apex = KNOWN_PREFIXES.includes(labels[0]) ? labels.slice(1).join(".") : hostname;
  return `${proto}://auth.${apex}`;
}

function publicCallbackUrl(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const pathname = new URL(req.url).pathname;
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
      const data = (await res.json()) as { roles?: string[] };
      isAdmin = (data.roles ?? []).includes("architect");
    }
  } catch {
    isAdmin = false;
  }

  if (!isAdmin) {
    const registerUrl = new URL(`${publicAuthBase(req)}/register`);
    registerUrl.searchParams.set("callbackUrl", publicCallbackUrl(req));
    registerUrl.searchParams.set("requireRole", "architect");
    return NextResponse.redirect(registerUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
