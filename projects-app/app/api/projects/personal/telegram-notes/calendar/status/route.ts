import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/get-session"
import { calendarCreds, hasToken } from "@/app/api/projects/personal/telegram-notes/_calendar/google-calendar"

// Connector status (step 207 Phase F, 207.12) for the Connectors settings tab. Reports whether the Google
// Calendar connector is CONFIGURED (env creds present) and CONNECTED (a token row exists). Never returns
// secret values. Inert without creds → { configured:false, connected:false }.
export const runtime = "nodejs"

const READ_ROLES = ["architect", "manager", "agent"]

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.roles?.some((r) => READ_ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  const configured = Boolean(calendarCreds())
  const connected = configured ? await hasToken() : false
  return NextResponse.json({ configured, connected })
}
