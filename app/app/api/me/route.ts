import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/get-session"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json(session)
}
