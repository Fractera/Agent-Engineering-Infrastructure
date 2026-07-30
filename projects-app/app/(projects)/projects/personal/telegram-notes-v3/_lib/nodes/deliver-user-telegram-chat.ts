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
import { converse } from "./converse";

export async function deliverUserTelegramChat(ctx: NodeCtx): Promise<{ userTelegramDelivery: string }> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { userTelegramDelivery: "skipped: TELEGRAM_BOT_TOKEN is not set — connect the Telegram channel in Settings" };
  }
  const chatId = String(ctx.telegramChatId ?? process.env.TELEGRAM_USER_CHAT_ID ?? "").trim();
  if (!chatId) {
    return { userTelegramDelivery: "skipped: no user chat — link it via api/telegram/link (TELEGRAM_USER_CHAT_ID)" };
  }
  // 🔒 РАЗГОВОРНЫЙ СЛОЙ ЖИВЁТ ЗДЕСЬ, В ВЫХОДНОМ УЗЛЕ (решение владельца 2026-07-30, вариант A): построение
  // ответа — не отдельный узел на холсте, а внутренняя работа доставки в личный чат. `converse` читает
  // сценарий вкладки «Ассистент» + буфер диалога + структурный результат прогона и думает моделью
  // (фолбэк — детерминированный `composeReply`). Если разговор дал ответ (`reply`) — шлём его; иначе
  // (нет chatId в контексте / простой стартер без диалога) — прежний сырой путь, чтобы стартер жил.
  const built = await converse(ctx);
  const reply = String((built as Record<string, unknown>).reply ?? "").trim();
  if (reply) {
    const id = await sendTelegram(reply, chatId);
    return { userTelegramDelivery: `sent ${id} to ${chatId}` };
  }
  const m = messageOf(ctx);
  const stem = m.title.replace(/…$/, "");
  const titleAddsNothing = !stem || m.text.replace(/\s+/g, " ").trim().startsWith(stem.replace(/\s+/g, " ").trim());
  const id = await sendTelegram(`${titleAddsNothing ? "" : `${m.title}\n\n`}${m.text}\n\n— captured from ${m.source}`, chatId);
  return { userTelegramDelivery: `sent ${id} to ${chatId}` };
}
