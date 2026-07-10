import { NextResponse } from "next/server"

// Sets this automation's Telegram bot command menu (step 205 §I) via setMyCommands. Called after the bot
// token is connected. The menu shows the automation's functions as slash commands; the workflow maps a
// leading slash command deterministically to its action (no model needed).
export const runtime = "nodejs"

const TG = "https://api.telegram.org"
const COMMANDS = [
  { command: "help", description: "What this bot can do" },
  { command: "remember", description: "Save a note" },
  { command: "remind", description: "Set a date reminder" },
  { command: "digitize", description: "Digitize a receipt / document" },
  { command: "recall", description: "Find something you saved" },
  { command: "photo", description: "Send back the receipt of a finance record" },
]

export async function POST() {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? ""
  if (!token) return NextResponse.json({ ok: false, error: "No bot token set yet." }, { status: 400 })
  try {
    const r = await fetch(`${TG}/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: COMMANDS }),
      signal: AbortSignal.timeout(15000),
    })
    const data = (await r.json().catch(() => ({}))) as { ok?: boolean; description?: string }
    if (!data.ok) return NextResponse.json({ ok: false, error: data.description ?? `HTTP ${r.status}` }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 })
  }
}
