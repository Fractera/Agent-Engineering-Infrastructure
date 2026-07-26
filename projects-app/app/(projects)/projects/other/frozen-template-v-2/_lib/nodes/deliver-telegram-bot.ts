// ФУНКЦИЯ УЗЛА «OUTPUT» (канал telegram-bot) — отправляет сообщение через СОБСТВЕННОГО бота
// автоматизации в его рабочий чат (`TELEGRAM_ALLOWED_CHAT_ID`). Отправка живёт в `_lib/transport.ts`
// (тот же вызов, что у календаря) — здесь только сборка текста.
//
// Канал НЕ НАСТРОЕН (нет токена/чата) → честный ПРОПУСК с причиной: неподключённый Telegram не должен
// убивать доставку в остальные выходы. Telegram ОТКАЗАЛ при живых ключах → бросок (транспорт бросает
// сам). Имя `deliverTelegramBot` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf } from "../message";
import { sendTelegram } from "../transport";

export async function deliverTelegramBot(ctx: NodeCtx): Promise<{ telegramBotDelivery: string }> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_ALLOWED_CHAT_ID) {
    return { telegramBotDelivery: "skipped: TELEGRAM_BOT_TOKEN / TELEGRAM_ALLOWED_CHAT_ID are not set — connect the Telegram channel in Settings" };
  }
  const m = messageOf(ctx);
  const id = await sendTelegram(`${m.title}\n\n${m.text}\n\n— captured from ${m.source}`);
  return { telegramBotDelivery: `sent ${id}` };
}
