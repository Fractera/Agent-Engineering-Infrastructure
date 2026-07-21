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

// SURFACE BY ADDRESS (requirement 4) — the PUBLIC surface is the apex host (aifa.dev), the COCKPIT is the
// `projects.` service subdomain. The public host is any real domain whose first label is NOT a known
// service prefix; IP / localhost is neither (its onboarding bypass is handled elsewhere). An automation's
// content page on the public host is a visitor page and is served WITHOUT auth (surface="public"); the
// cockpit host keeps its architect/manager gate exactly as before — this branch never touches it.
function isPublicHost(host: string | null): boolean {
  const hostname = (host || "").split(":")[0];
  if (!hostname) return false;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname === "localhost") return false;
  const labels = hostname.split(".");
  return labels.length >= 2 && !KNOWN_PREFIXES.includes(labels[0]);
}

// Only an automation's own content page (…/projects/<cat>/<slug>[/…], optional /<lang> prefix) is public.
const PUBLIC_PAGE = /^\/(?:[a-z]{2}\/)?projects\/[^/]+\/[^/]+/;

export async function proxy(req: NextRequest) {
  // 256.1 — hand the current path to server components: requireRole() (the second belt) needs it to
  // build a callbackUrl, and headers() alone cannot see the pathname. Set on EVERY pass-through.
  const url = new URL(req.url);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", url.pathname + url.search);

  // The surface the page must render (requirement 4): public on the apex host, admin otherwise. Set on
  // every pass-through so the page component reads it from headers().
  const reqHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const publicSurface = isPublicHost(reqHost);
  requestHeaders.set("x-surface", publicSurface ? "public" : "admin");

  // PUBLIC VISITOR PAGE (requirement 4): the automation's own page on the public host is open — no auth.
  // Its API doors still self-gate (a visitor has no session), and only content pages match; service pages
  // and the cockpit host fall through to the gate below, untouched.
  if (publicSurface && PUBLIC_PAGE.test(url.pathname)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // HOST-AWARE bypass (256.4b): the onboarding bypass applies only to IP/localhost hosts — a DOMAIN
  // request (projects.<apex>) is the protected flow and enforces auth even while the env is IP mode.
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
