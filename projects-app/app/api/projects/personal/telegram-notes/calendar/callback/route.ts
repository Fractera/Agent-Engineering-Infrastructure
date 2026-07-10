import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/get-session"
import { exchangeCode, redirectUri, saveToken } from "@/app/api/projects/personal/telegram-notes/_calendar/google-calendar"

// OAuth step 2 (step 207 Phase F, 207.13): Google redirects here with ?code=…; exchange it for tokens and
// persist them (refresh_token drives long-lived access). Then bounce the owner back to the project settings
// page with a status flag. The redirect URI passed to the token endpoint MUST equal the one used in step 1,
// so it is rebuilt from the same request origin.
export const runtime = "nodejs"

const WRITE_ROLES = ["architect", "manager", "agent"]
const SETTINGS_PATH = "/projects/personal/telegram-notes"

function back(origin: string, status: string) {
  return NextResponse.redirect(`${origin}${SETTINGS_PATH}?calendar=${status}`)
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.roles?.some((r) => WRITE_ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const origin = req.nextUrl.origin
  if (req.nextUrl.searchParams.get("error")) return back(origin, "denied")
  const code = req.nextUrl.searchParams.get("code") ?? ""
  if (!code) return back(origin, "error")

  const tok = await exchangeCode(code, redirectUri(origin))
  if (!tok || !tok.accessToken) return back(origin, "error")
  await saveToken({ accessToken: tok.accessToken, refreshToken: tok.refreshToken, expiry: tok.expiry })
  return back(origin, "connected")
}
