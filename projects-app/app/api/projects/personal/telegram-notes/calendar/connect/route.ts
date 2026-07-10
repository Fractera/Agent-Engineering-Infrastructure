import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/get-session"
import { buildConsentUrl, calendarCreds, redirectUri } from "@/app/api/projects/personal/telegram-notes/_calendar/google-calendar"

// OAuth step 1 (step 207 Phase F, 207.13): redirect the owner to Google's consent screen for
// calendar.events access. The redirect URI is built from THIS request's origin so it matches what the
// owner registered in the Google OAuth client (in IP mode: http://<IP>:3000/.../calendar/callback).
// Inert without creds → 422 (the Connectors tab keeps the button disabled anyway).
export const runtime = "nodejs"

const WRITE_ROLES = ["architect", "manager", "agent"]

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.roles?.some((r) => WRITE_ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const creds = calendarCreds()
  if (!creds) {
    return NextResponse.json({ error: "Calendar connector not configured" }, { status: 422 })
  }
  const url = buildConsentUrl(creds.clientId, redirectUri(req.nextUrl.origin))
  return NextResponse.redirect(url)
}
