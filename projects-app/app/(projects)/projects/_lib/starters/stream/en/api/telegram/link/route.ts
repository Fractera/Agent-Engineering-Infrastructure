import { type NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authorize } from "@/lib/nodes";
import { readEnvLines } from "@/lib/env-presence";

export const runtime = "nodejs";

// НАТИВНОЕ СВЯЗЫВАНИЕ TELEGRAM — определить chat id без ребуса и без чужих ботов (шаг 296).
//
// ЗАЧЕМ. Чтобы бот мог ПИСАТЬ человеку, человек обязан первым написать боту (правило Telegram: бот не
// имеет права инициировать переписку). Значит один контакт с ботом неустраним. Эта дверь сводит его к
// двум тапам: владелец жмёт кнопку → открывается Telegram с ботом и кнопкой START → жмёт START → мы
// сразу знаем chat id. Никакого @userinfobot, никакого копирования чисел.
//
// КАК. Кнопка START несёт наш одноразовый код в deep-link `t.me/<bot>?start=<code>`. Нажатие Start шлёт
// боту служебное сообщение `/start <code>`, а Telegram кладёт в него `chat.id` отправителя. Мы читаем
// входящие бота обычным запросом `getUpdates`, находим сообщение с нашим кодом и берём chat.id из него
// же. Один код + один chat.id в одном сообщении — вот почему связывание точное, а не наугад.
//
// 🔒 ЭТА ДВЕРЬ НИЧЕГО НЕ ПИШЕТ. Она только ОПРЕДЕЛЯЕТ chat id и возвращает его форме. Запись в
// `.env.local` делает обычная кнопка «Сохранить» (дверь `api/env`) — иначе «связал, но передумал и
// закрыл» оставило бы значение записанным, а это нарушение закона отмены формы ключей.
//
// ЕДИНСТВЕННЫЙ ПОТРЕБИТЕЛЬ. `getUpdates` отдаёт каждый апдейт ровно одному читателю. Этот бот НЕ в
// registry сервиса-слушателя (`services/automations-listener`), поэтому его входящие читает только эта
// дверь. Если бот когда-нибудь станет ВХОДНЫМ каналом (его начнёт поллить слушатель), связывание
// обязано переехать в слушатель — второй `getUpdates` на один бот съедает сообщения (урок шага 205).

// Одноразовые коды: код → момент выдачи. Живут в памяти процесса (fork, один инстанс), гаснут через TTL.
// Потеря при рестарте безвредна: владелец просто нажмёт «Связать» заново.
const CODE_TTL_MS = 10 * 60_000;
const pending = new Map<string, number>();
function sweep() {
  const now = Date.now();
  for (const [code, born] of pending) if (now - born > CODE_TTL_MS) pending.delete(code);
}

function botTokenFrom(lines: string[]): string | null {
  for (const line of lines) {
    const m = /^\s*TELEGRAM_BOT_TOKEN\s*=(.*)$/.exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

async function telegram(token: string, method: string, query = ""): Promise<any> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}${query}`);
    return await r.json();
  } catch {
    return null;
  }
}

// GET ?action=start          → { code, bot, deepLink }
// GET ?action=poll&code=CODE → { status: "waiting" | "linked" | "expired", chatId?, who? }
export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const token = botTokenFrom(await readEnvLines());
  if (!token) return NextResponse.json({ error: "no_bot_token" }, { status: 422 });

  const action = req.nextUrl.searchParams.get("action");

  if (action === "start") {
    sweep();
    const me = await telegram(token, "getMe");
    const bot = me?.result?.username as string | undefined;
    if (!bot) return NextResponse.json({ error: "bot_unreachable" }, { status: 502 });
    const code = `link${randomBytes(8).toString("hex")}`;
    pending.set(code, Date.now());
    return NextResponse.json({ code, bot, deepLink: `https://t.me/${bot}?start=${code}` });
  }

  if (action === "poll") {
    const code = (req.nextUrl.searchParams.get("code") ?? "").trim();
    if (!code || !pending.has(code)) return NextResponse.json({ status: "expired" });

    const upd = await telegram(token, "getUpdates", `?timeout=0&allowed_updates=%5B%22message%22%5D`);
    const results: any[] = Array.isArray(upd?.result) ? upd.result : [];
    for (const u of results) {
      const msg = u?.message;
      const text = String(msg?.text ?? "").trim();
      if (text === `/start ${code}` && msg?.chat?.id != null) {
        pending.delete(code);
        const chat = msg.chat;
        const who = chat.username
          ? `@${chat.username}`
          : [chat.first_name, chat.last_name].filter(Boolean).join(" ") || String(chat.id);
        return NextResponse.json({ status: "linked", chatId: String(chat.id), who });
      }
    }
    return NextResponse.json({ status: "waiting" });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
