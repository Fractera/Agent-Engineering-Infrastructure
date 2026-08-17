import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import { requireAuth } from "@/lib/require-auth"
import { publicDataUrl } from "@/lib/public-data-url"

const APP_ENV  = process.env.APP_ENV_PATH  ?? "/opt/fractera/app/.env.local"
const DATA_ENV = process.env.DATA_ENV_PATH ?? "/opt/fractera/services/data/.env"

// Keys that are server-infrastructure-only and should not go into local dev
const EXCLUDE_KEYS = new Set([
  "APP_DB_PATH",
  "AUTH_TRUST_HOST",
  "NEXT_PUBLIC_MEDIA_URL", // exported as REMOTE_DATA_URL
])

function readAllVars(file: string): Record<string, string> {
  try {
    const content = fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : ""
    const result: Record<string, string> = {}
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq < 0) continue
      result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1)
    }
    return result
  } catch { return {} }
}

function readVar(file: string, key: string): string {
  const vars = readAllVars(file)
  return vars[key] ?? ""
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "")
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const appVars    = readAllVars(APP_ENV)
  const dataSecret = readVar(DATA_ENV, "DATA_SECRET")

  // (step 500) The address is RESOLVED for the receiving machine, not copied from
  // this server's own env. NEXT_PUBLIC_MEDIA_URL is "http://localhost:3300" here —
  // correct on the server, and on a developer's laptop it points at the laptop.
  // That one line is why the local-development loop silently did nothing.
  const data = publicDataUrl()

  if (!dataSecret) {
    return NextResponse.json({ error: "Could not read the data secret" }, { status: 500 })
  }
  if (!data.url) {
    return NextResponse.json({ error: data.reason ?? "Could not resolve the public data address" }, { status: 409 })
  }

  const lines: string[] = [
    `# Local dev — connects to your production server`,
    `# Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
    `# Rename this file to .env.local and place it in your project root`,
    ``,
    `# --- Remote data & media (required for local dev) ---`,
    `# Your local app reads and writes the SERVER's rows, files and vector memory`,
    `# through this address. Nothing is copied to your machine, so there are no`,
    `# two versions of the data to drift apart.`,
    `REMOTE_DATA_URL=${data.url}`,
    // 🔒 ИМЯ КЛЮЧА — `DATA_SECRET` (исправлено 2026-08-17). Здесь выдавалось
    // `DATA_API_KEY` — имя, которого нет в окружении сервера, — и локальная
    // копия работала не так, как продакшн: часть кода искала `DATA_SECRET` и не
    // находила. Одно имя на обе среды и есть смысл этой выдачи.
    //
    // Запасное имя пишется рядом ради проектов, склонированных раньше: их код
    // мог остаться со старым чтением, и отобрать у него ключ значило бы сломать
    // машину разработчика правкой на сервере.
    `DATA_SECRET=${dataSecret}`,
    `DATA_API_KEY=${dataSecret}`,
    ``,
  ]

  // Append all remaining custom vars from app/.env.local
  const customEntries = Object.entries(appVars).filter(([k]) => !EXCLUDE_KEYS.has(k))
  if (customEntries.length > 0) {
    lines.push(`# --- All other server env vars ---`)
    for (const [k, v] of customEntries) {
      lines.push(`${k}=${v}`)
    }
    lines.push(``)
  }

  const content = lines.join("\n")

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename=".env.local"; filename*=UTF-8''.env.local`,
    },
  })
}
