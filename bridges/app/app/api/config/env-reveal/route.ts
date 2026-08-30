// @api reveal one named service secret to the signed-in architect

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { requireAuth } from "@/lib/require-auth";
import { openAiKey } from "@/lib/quiz-brain";

// ПОКАЗАТЬ ОДНО НАЗВАННОЕ ЗНАЧЕНИЕ — ПО НАЖАТИЮ, А НЕ В РАЗМЕТКЕ (шаг 47, 2026-08-30).
//
// 🔒 ЗАЧЕМ ЭТА ДВЕРЬ ВООБЩЕ ПОЯВИЛАСЬ. Владелец: «я хочу чтобы там можно было
// увидеть Telegram Token and name и OpenAI ключ если я нажму на глазик… мне нужно
// перейти и скопировать для того чтобы сверить». До неё сверка требовала ухода в
// другой раздел панели: эти значения живут НЕ в файле окружения, а в конфиге
// службы каналов и в `.env` службы RAG, и страница окружения их не видела.
//
// 🔒 ЭТО ОТМЕНА ПОЛОВИНЫ ЗАКОНА, И ОТМЕНА НАЗВАНА. В `env/_lib/env.ts` стоит:
// «ввести новое значение можно, увидеть старое — нет». Решением владельца вторая
// половина снята: панель закрыта ролью архитектора до первого пикселя, сервер и
// секреты его. ПЕРВАЯ половина закона осталась и определила конструкцию:
// **значение не лежит в разметке страницы**. Оно приезжает отдельным запросом по
// нажатию — разметка попадает в историю браузера и в предпросмотр вкладки,
// нажатие не попадает никуда.
//
// 🔒 ЗАКРЫТЫЙ СПИСОК ИМЁН, А НЕ ПУТЬ В ПАРАМЕТРЕ. Дверь, принимающая имя файла или
// ключа, — это дверь к любому файлу на машине. Принимающая одно из четырёх слов —
// дверь ровно к четырём значениям, и расширяется она правкой этого файла, то есть
// осознанно.

const CHANNELS_CONFIG =
  process.env.CHANNELS_CONFIG ?? "/opt/fractera/services/channels/config.json";
// Тот же адрес, которым пользуются соседние маршруты каналов (`api/channels/*`).
const CHANNELS_URL = process.env.CHANNELS_URL ?? "http://127.0.0.1:3500";

/** Имена, которые дверь согласна показать. Ничего сверх списка не существует. */
const NAMES = ["telegramToken", "telegramBot", "telegramChatId", "openaiKey"] as const;
type RevealName = (typeof NAMES)[number];

const isRevealName = (v: unknown): v is RevealName =>
  typeof v === "string" && (NAMES as readonly string[]).includes(v);

/**
 * Конфиг службы каналов. Читается на КАЖДЫЙ запрос, а не кэшируется: владелец
 * привязывает бота в соседней вкладке и тут же возвращается сюда сверять — кэш
 * показал бы ему прошлое состояние и был бы неотличим от «не сохранилось».
 */
function channelsFile(): { token: string; chatId: string } {
  try {
    const raw = JSON.parse(fs.readFileSync(CHANNELS_CONFIG, "utf8"));
    const tg = raw?.telegram ?? {};
    return { token: String(tg.token ?? ""), chatId: String(tg.chatId ?? "") };
  } catch {
    return { token: "", chatId: "" };
  }
}

/**
 * Имя бота — у СЛУЖБЫ, а не в файле.
 *
 * 🔒 ИЗМЕРЕНО, А НЕ ПРЕДПОЛОЖЕНО (2026-08-30): в `config.json` лежат `token`,
 * `chatId`, `who` и `linkedAt` — имени бота там нет вовсе. Его знает служба
 * каналов: она спрашивает Telegram и отдаёт в `/status` полем `bot`. Значит
 * читать файл ради имени бессмысленно — вернулась бы пустая строка, а человек
 * прочитал бы её как «бот не привязан».
 */
async function botName(): Promise<string> {
  try {
    const r = await fetch(`${CHANNELS_URL}/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return "";
    const d = await r.json();
    return String(d?.telegram?.bot ?? "");
  } catch {
    return "";
  }
}

async function valueOf(name: RevealName): Promise<string> {
  if (name === "telegramBot") return botName();
  if (name === "telegramToken") return channelsFile().token;
  if (name === "telegramChatId") return channelsFile().chatId;
  // 🔒 Ключ OpenAI берётся ВЫЗОВОМ общей функции панели, а не чтением файла:
  // порядок поиска у неё один (переменная процесса → `.env` RAG → `.env.local`
  // слота), и второй его экземпляр разошёлся бы с первым в день переезда ключа.
  return openAiKey();
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = (body as { name?: unknown })?.name;
  if (!isRevealName(name)) {
    return NextResponse.json({ error: "unknown name" }, { status: 400 });
  }

  const value = await valueOf(name);
  // Пусто — это ответ, а не ошибка: значение может быть не настроено, и человеку
  // важно увидеть именно «не настроено», а не отказ, который читается как поломка.
  return NextResponse.json({ value, empty: value === "" });
}
