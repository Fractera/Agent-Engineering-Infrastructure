// ФУНКЦИЯ УЗЛА «INPUT» (канал user-telegram-chat) — сообщение из ЛИЧНОГО чата пользователя с ботом
// (чат связывается нативной дверью `api/telegram/link`, шаг 296). Слушатель толкает его в дверь
// запуска (`POST api/run { source: "user-telegram-chat", … }`), узел нормализует в общий `Message`.
//
// От `telegram-bot` канал отличается АДРЕСАТОМ: там пишут боту автоматизации (заявки извне), здесь —
// пользователь в своём личном чате (его собственные заметки). Ключи канала объявлены на узле в ядре;
// нормализация ключей не требует. Пустое сообщение — отказ у двери.
// Имя `receiveUserTelegramChat` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { captured, channelOf, emptyInput, refuse } from "../message";

export function receiveUserTelegramChat(ctx: NodeCtx): NodeCtx {
  if (channelOf(ctx) !== "user-telegram-chat") return {};
  const update = (ctx.message && typeof ctx.message === "object" ? ctx.message : {}) as Record<string, unknown>;
  const text = String(ctx.text ?? update.text ?? "").trim();
  if (!text) refuse(emptyInput("user-telegram-chat"));
  const chat = (update.chat && typeof update.chat === "object" ? update.chat : {}) as Record<string, unknown>;
  const chatId = String(ctx.telegramChatId ?? chat.id ?? "").trim();
  return { ...captured(ctx, "user-telegram-chat", text), ...(chatId ? { telegramChatId: chatId } : {}) };
}
