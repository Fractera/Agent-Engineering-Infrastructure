import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Shell keeps only /api/config — protect it with session cookie check
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") && pathname !== "/api/health") {
    if (process.env.NODE_ENV !== "development") {
      const agentIdentity = request.headers.get("x-agent-identity");
      if (!agentIdentity) {
        const sessionToken =
          request.cookies.get("authjs.session-token") ??
          request.cookies.get("__Secure-authjs.session-token");

        if (!sessionToken) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
