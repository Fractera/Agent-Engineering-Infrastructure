import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { shouldBypassAuth } from "@/lib/auth/auth-bypass";
import { getSession } from "@/lib/auth/get-session";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  SINGLE_LANG_MODE,
} from "@/config/translations/translations.config";

// This middleware (Next 16: file is proxy.ts, never middleware.ts) does TWO jobs:
//   1. /api/*  — OUR authoritative auth-gate (unchanged): session-cookie check + admin role
//      for the service-page API namespaces. We do NOT use the reference app's auth.
//   2. page routes — locale detection / [lang] rewrite (ported from 22slots, auth-agnostic).
//      In single-language mode the lang segment is hidden: /architecture is rewritten to
//      /en/architecture internally, so a one-language deployment stays monolingual at the root.

// --- API auth-gate (job 1, our authoritative method — kept identical) ---------------------

// API namespaces behind the admin-only service pages (AI Core, Architecture, Development
// steps, Patterns, Glossary, Documents, AI Draft Settings, Debug). Deliberately EXCLUDED
// (shared / needed by the public app or non-admin users): /api/health, /api/me, /api/media/*,
// and the Dashboard's /api/project/default/products. Agents (x-agent-identity) and IP mode
// (shouldBypassAuth) are always allowed — agents must keep writing these files.
const ADMIN_API_PREFIXES = [
  "/api/glossary",
  "/api/patterns",
  "/api/development-steps",
  "/api/ai-draft-settings",
  "/api/documents",
  "/api/projects",
  "/api/project/default/architecture",
  "/api/project/default/source",
  "/api/project/default/routing",
];

async function handleApi(request: NextRequest, pathname: string): Promise<NextResponse> {
  // Public media READS — generated favicon/PWA icons AND brand/page images (logo, OG, page
  // pictures) are referenced by the manifest, <head> and the public site and fetched before
  // login. Open for READ, closed for WRITE: GET passes publicly; any write (upload / POST /
  // PUT / DELETE) falls through to the auth gate below. Previously only /api/media/icons/ was
  // public, so the logo (/api/media/<id>/file) 401'd for anonymous visitors → broken logo.
  if (pathname.startsWith("/api/media/") && request.method === "GET") {
    return NextResponse.next();
  }

  // Public config signature — the tiny client poller (ConfigReloadWatcher) reads this on every
  // page (incl. the public site, before login) to reload tabs after an "apply now" platform
  // change. Read-only, no secrets. Open like /api/health.
  if (pathname === "/api/platform/signature" && request.method === "GET") {
    return NextResponse.next();
  }

  if (pathname !== "/api/health") {
    if (!shouldBypassAuth()) {
      const agentIdentity = request.headers.get("x-agent-identity");
      if (!agentIdentity) {
        const sessionToken =
          request.cookies.get("authjs.session-token") ??
          request.cookies.get("__Secure-authjs.session-token");

        if (!sessionToken) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Admin-gate the service-page API namespaces (role, not just a cookie).
        if (ADMIN_API_PREFIXES.some((p) => pathname.startsWith(p))) {
          const session = await getSession(request);
          if (!session?.roles?.includes("architect")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
        }
      }
    }
  }

  return NextResponse.next();
}

// --- locale detection / rewrite (job 2, ported from 22slots) -------------------------------

const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

function hasLocalePrefix(pathname: string): boolean {
  return SUPPORTED_LANGUAGES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
}

function extractLocaleFromPath(pathname: string): string {
  return pathname.split("/")[1];
}

function detectUserLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale && SUPPORTED_LANGUAGES.includes(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get("accept-language");
  if (!acceptLanguage) return DEFAULT_LANGUAGE;

  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, priorityString] = lang.trim().split(";q=");
      return {
        code: code.split("-")[0].toLowerCase(),
        priority: priorityString ? Number.parseFloat(priorityString) : 1.0,
      };
    })
    .sort((a, b) => b.priority - a.priority);

  const matched = languages.find((lang) => SUPPORTED_LANGUAGES.includes(lang.code));
  return matched ? matched.code : DEFAULT_LANGUAGE;
}

function setLocaleCookie(response: NextResponse, locale: string): NextResponse {
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

function handlePage(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Single-language mode: hide the lang segment from public URLs.
  if (SINGLE_LANG_MODE) {
    const singleLang = SUPPORTED_LANGUAGES[0];

    // /en/about → redirect to /about (301)
    if (hasLocalePrefix(pathname)) {
      const withoutLang = pathname.replace(`/${singleLang}`, "") || "/";
      const url = request.nextUrl.clone();
      url.pathname = withoutLang;
      return setLocaleCookie(NextResponse.redirect(url, 301), singleLang);
    }

    // /about → rewrite to /en/about internally (URL stays clean)
    const url = request.nextUrl.clone();
    url.pathname = `/${singleLang}${pathname}`;
    return setLocaleCookie(NextResponse.rewrite(url), singleLang);
  }

  // Multi-language mode.
  if (hasLocalePrefix(pathname)) {
    const currentLocale = extractLocaleFromPath(pathname);
    return setLocaleCookie(NextResponse.next(), currentLocale);
  }

  const detectedLocale = detectUserLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${detectedLocale}${pathname}`;
  return setLocaleCookie(NextResponse.redirect(url), detectedLocale);
}

// --- entry --------------------------------------------------------------------------------

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return handleApi(request, pathname);
  }

  return handlePage(request);
}

// Match page routes (for locale handling) AND /api/* (for the auth-gate). Exclude Next
// internals, metadata files and anything with a file extension. `api` is intentionally NOT
// excluded so the gate above keeps running.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest|.*\\..*).*)",
  ],
};
