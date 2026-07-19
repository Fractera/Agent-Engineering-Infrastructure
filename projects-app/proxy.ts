import { NextRequest, NextResponse } from "next/server";
import { shouldBypassAuth } from "@/lib/auth-bypass";

// Projects service proxy (step 197) — mirrors bridges/app/proxy.ts, but the Projects zone
// admits BOTH architect and manager (the zone's requireRole set, §3.12), whereas admin is
// architect-only. Pages are gated here (a single choke point); /api/* is EXCLUDED from the
// matcher and every project API self-gates (mirror of service-auth in bridges/app). In IP /
// demo mode shouldBypassAuth() opens the whole zone (onboarding).
//
// No language prefixing to worry about: this app serves ONLY the monolingual /projects zone,
// so there is no [lang] router and no SERVICE_ROOTS carve-out to maintain (that logic stays in
// the FNS slot proxy, which drops `projects` once the zone leaves the slot — 197.9).
const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? "http://localhost:3001";

// Service subdomain prefixes — used to recover the apex from a service host
// (projects.aifa.dev → aifa.dev) when building the auth URL in domain/Secure mode.
const KNOWN_PREFIXES = ["www", "auth", "admin", "data", "hermes", "lightrag", "projects", "design"];

// Public base URL of the Auth service as the BROWSER must reach it.
// - IP / localhost (demo): same host, port 3001 (http://<ip>:3001).
// - Domain / Secure mode: sibling subdomain on 443, no port (https://auth.<apex>).
function publicAuthBase(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3003";
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
  // 256.1 — hand the current path to server components: requireRole() (the second belt) needs it to
  // build a callbackUrl, and headers() alone cannot see the pathname. Set on EVERY pass-through.
  const url = new URL(req.url);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", url.pathname + url.search);

  // HOST-AWARE bypass (256.4b): the onboarding bypass applies only to IP/localhost hosts — a DOMAIN
  // request (projects.<apex>) is the protected flow and enforces auth even while the env is IP mode.
  const reqHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (shouldBypassAuth(reqHost)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // IN-ROUTE API DOORS (254.10/254.11) live INSIDE the page tree — /projects/<cat>/<slug>/api/… — so the
  // matcher's root `api/` carve-out misses them and this page gate answered them with a 307 to the auth
  // LANDING PAGE (useless for a machine caller; proven live 263.1 round 8: the room agent's own run/rows
  // calls bounced). They are APIs: every one self-gates through the shared authorize() (session, IP mode,
  // or the agent-gate pass) and must return honest JSON 403s, not redirects.
  if (/^\/projects\/[^/]+\/[^/]+\/api\//.test(url.pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const cookie = req.headers.get("cookie") ?? "";

  let allowed = false;
  try {
    const res = await fetch(`${AUTH_SERVICE}/api/session`, {
      headers: { cookie },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as { roles?: string[] };
      const roles = data.roles ?? [];
      allowed = roles.includes("architect") || roles.includes("manager");
    }
  } catch {
    allowed = false;
  }

  if (!allowed) {
    const registerUrl = new URL(`${publicAuthBase(req)}/register`);
    registerUrl.searchParams.set("callbackUrl", publicCallbackUrl(req));
    // 256.1 — the zone admits architect AND manager; require the LEAST privileged sufficient role
    // (auth's requireRole is "the minimum needed", and its extra architect gate must not fire here).
    registerUrl.searchParams.set("requireRole", "manager");
    return NextResponse.redirect(registerUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
