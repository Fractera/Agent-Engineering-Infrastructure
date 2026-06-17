import { NextResponse } from "next/server";

// Public flag endpoint — tells the login page which extra sign-in methods are
// active. A method is "on" only when its credentials are non-empty (bootstrap
// seeds them empty; the owner fills them in secure mode via Admin → Login
// methods). Empty credential → false → the login page hides that button.
// This is the "broadcast empty string, hide the button" contract.
//
// A static segment (app/api/auth/methods) takes precedence over the NextAuth
// catch-all (app/api/auth/[...nextauth]), so this is never swallowed by it.
export function GET() {
  return NextResponse.json({
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    magicLink: !!process.env.RESEND_API_KEY,
  });
}
