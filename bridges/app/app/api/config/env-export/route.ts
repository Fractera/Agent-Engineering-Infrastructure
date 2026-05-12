import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import { requireAuth } from "@/lib/require-auth"

const APP_ENV  = process.env.APP_ENV_PATH  ?? "/opt/fractera/app/.env.local"
const DATA_ENV = process.env.DATA_ENV_PATH ?? "/opt/fractera/services/data/.env"

function readVar(file: string, key: string): string {
  try {
    const content = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : ""
    const match = content.split("\n").find(l => l.startsWith(`${key}=`))
    return match ? match.slice(key.length + 1).trim() : ""
  } catch { return "" }
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "")
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const mediaUrl  = readVar(APP_ENV,  "NEXT_PUBLIC_MEDIA_URL")
  const dataSecret = readVar(DATA_ENV, "DATA_SECRET")

  if (!mediaUrl || !dataSecret) {
    return NextResponse.json({ error: "Could not read server env vars" }, { status: 500 })
  }

  const content = [
    `# Local dev — connects to your production server`,
    `# Generated from admin.${new Date().toISOString().slice(0, 10)}`,
    ``,
    `REMOTE_DATA_URL=${mediaUrl}`,
    `DATA_API_KEY=${dataSecret}`,
    ``,
  ].join("\n")

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename=".env.local"',
    },
  })
}
