import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/get-session"
import { deleteToken } from "@/app/api/projects/personal/telegram-notes/_calendar/google-calendar"

// OAuth teardown (step 207 Phase F, 207.13): drop this project's Google Calendar token so no more reminders
// are pushed. The env creds stay (owner can Connect again). Inert if there is no token.
export const runtime = "nodejs"

const WRITE_ROLES = ["architect", "manager", "agent"]

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.roles?.some((r) => WRITE_ROLES.includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }
  await deleteToken()
  return NextResponse.json({ ok: true })
}
