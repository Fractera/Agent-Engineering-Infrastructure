import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// "Test bot" (step 205 §F): sends a short capability message via THIS automation's bot so the owner sees
// it works. A Telegram bot cannot initiate a chat — the user must message it first — so we send to the
// most recent chat that talked to this automation (telegram_notes_state.last_chat_id, captured by the
// workflow on reception; falls back to the newest telegram_notes row). We do NOT call getUpdates: the
// substrate listener already long-polls this bot, and a second consumer would collide (409).
export const runtime = "nodejs"

const TG = "https://api.telegram.org"
const CAPABILITIES =
  "Hi! I'm your personal notes automation. Just send me a message and I sort it automatically:\n" +
  "• a fact to remember → I save it\n" +
  "• a time-based reminder → I remind you at the right time\n" +
  "• a question about what you saved → I search your notes\n" +
  "• a photo of a receipt → I digitize it into your records\n" +
  "If I'm not sure, I'll show you buttons to choose."

async function latestChatId(): Promise<string | null> {
  try {
    const row = (await db
      .prepare("SELECT value FROM telegram_notes_state WHERE key = 'last_chat_id'")
      .get()) as { value?: string } | null
    if (row?.value) return String(row.value)
  } catch {
    /* state table not present yet */
  }
  try {
    const row = (await db
      .prepare(
        "SELECT chat_id FROM telegram_notes WHERE project_slug = 'telegram-notes' AND chat_id != '' ORDER BY id DESC LIMIT 1",
      )
      .get()) as { chat_id?: string } | null
    if (row?.chat_id) return String(row.chat_id)
  } catch {
    /* notes table not present yet */
  }
  return null
}

export async function POST() {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? ""
  if (!token) return NextResponse.json({ ok: false, error: "No bot token set yet." }, { status: 400 })

  const chatId = await latestChatId()
  if (!chatId) {
    return NextResponse.json({
      ok: false,
      needsMessage: true,
      error: "Send your bot any message first, then press Test again.",
    })
  }

  try {
    const s = await fetch(`${TG}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: CAPABILITIES }),
      signal: AbortSignal.timeout(15000),
    })
    if (!s.ok) return NextResponse.json({ ok: false, error: `Telegram HTTP ${s.status}` }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 })
  }
}
