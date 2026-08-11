import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth/auth";

// GET /logout?redirectUrl=<absolute-app-url> — sign-out endpoint for the app shell (step 169).
//
// The public app's account drawer links to a relative /logout on ITS host; the app's proxy
// (AUTH_FORM_PATHS) redirects that here with an absolute redirectUrl back to the site (this
// service cannot derive the app origin itself: a different port in IP mode, a different
// subdomain in Secure mode). We clear the NextAuth session (JWT strategy — clearing the
// session cookie IS the sign-out; signOut() handles the secure/insecure cookie names and the
// COOKIE_DOMAIN family) and redirect ourselves, deliberately NOT via signOut({redirectTo}):
// that path runs the NextAuth redirect callback, which only allows the COOKIE_DOMAIN family —
// unset in IP mode, where the app lives on another PORT of the same host and would be dropped.
//
// Plain GET navigation (no JS required — the drawer link works with JavaScript off), same
// pattern as the sibling /api/auth/guest route (signIn from a route handler).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = searchParams.get("redirectUrl") || "/login";

  await signOut({ redirect: false });

  // Relative fallbacks resolve against this auth host (the /login form) — harmless; the proxy
  // always sends an absolute redirectUrl in practice.
  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
