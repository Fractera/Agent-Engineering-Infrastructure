import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { shouldBypassAuth } from "@/lib/auth/auth-bypass";
import { getSession } from "@/lib/auth/get-session";

// API namespaces behind the admin-only service pages (AI Core, Architecture,
// Development steps, Patterns, Glossary, Documents, AI Draft Settings, Debug).
// Calls to these require the admin role. Deliberately EXCLUDED (shared / needed by
// the public app or non-admin users): /api/health, /api/me, /api/media/*, and the
// Dashboard's /api/project/default/products. Agents (x-agent-identity) and IP mode
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

// Shell keeps only /api/* — protect it with a session cookie check, and require the
// admin role for the service-page API namespaces above.
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Generated favicon / PWA icon assets are public brand files referenced by the
  // manifest and <head> (fetched by the browser before login) — never gate them.
  if (pathname.startsWith("/api/media/icons/")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/") && pathname !== "/api/health") {
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
          if (!session?.roles?.includes("admin")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
