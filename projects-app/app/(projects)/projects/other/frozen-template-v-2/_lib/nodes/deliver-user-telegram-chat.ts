// ФУНКЦИЯ УЗЛА «OUTPUT» (канал user-telegram-chat) — пишет сообщение в ЛИЧНЫЙ чат пользователя.
// Чат определяется нативным связыванием (`api/telegram/link`, шаг 296) и хранится в
// `TELEGRAM_USER_CHAT_ID`; если прогон сам принёс `telegramChatId` (ответ отправителю), он важнее.
//
// От `telegram-bot` канал отличается АДРЕСАТОМ: там — рабочий чат автоматизации, здесь — личный чат
// человека. Токен бота общий (один сервис — один ключ, настройка по сервисам, шаг 294.1). Канал не
// настроен → честный ПРОПУСК с причиной; Telegram отказал → бросок (транспорт бросает сам).
// Имя `deliverUserTelegramChat` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf } from "../message";
import { sendTelegram } from "../transport";

export async function deliverUserTelegramChat(ctx: NodeCtx): Promise<{ userTelegramDelivery: string }> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { userTelegramDelivery: "skipped: TELEGRAM_BOT_TOKEN is not set — connect the Telegram channel in Settings" };
  }
  const chatId = String(ctx.telegramChatId ?? process.env.TELEGRAM_USER_CHAT_ID ?? "").trim();
  if (!chatId) {
    return { userTelegramDelivery: "skipped: no user chat — link it via api/telegram/link (TELEGRAM_USER_CHAT_ID)" };
  }
  const m = messageOf(ctx);
  const id = await sendTelegram(`${m.title}\n\n${m.text}\n\n— captured from ${m.source}`, chatId);
  return { userTelegramDelivery: `sent ${id} to ${chatId}` };
}
