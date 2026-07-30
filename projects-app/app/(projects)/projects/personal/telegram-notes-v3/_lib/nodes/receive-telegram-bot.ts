// ФУНКЦИЯ УЗЛА «INPUT» (канал telegram-bot) — сообщение, присланное СОБСТВЕННОМУ боту автоматизации.
// Слушатель бота толкает апдейт в дверь запуска (`POST api/run { source: "telegram-bot", … }`); узел
// понимает и сырую форму Telegram (`{ message: { text, chat: { id } } }`), и уже разобранную (`text`).
//
// Живой приём требует ключей канала (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_CHAT_ID` — объявлены на
// узле в ядре); сам узел ключей не читает — он только нормализует то, что втолкнули (вход push, закон 3).
// `telegramChatId` кладётся в контекст: выход-«ответ в чат» вправе ответить именно отправителю.
// Имя `receiveTelegramBot` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { captured, channelOf, emptyInput, refuse } from "../message";

export function receiveTelegramBot(ctx: NodeCtx): NodeCtx {
  if (channelOf(ctx) !== "telegram-bot") return {};
  const update = (ctx.message && typeof ctx.message === "object" ? ctx.message : {}) as Record<string, unknown>;
  const text = String(ctx.text ?? update.text ?? "").trim();
  if (!text) refuse(emptyInput("telegram-bot"));
  const chat = (update.chat && typeof update.chat === "object" ? update.chat : {}) as Record<string, unknown>;
  const chatId = String(ctx.telegramChatId ?? chat.id ?? "").trim();
  // ID БОТА, ЧЕРЕЗ КОТОРОГО ПРИШЁЛ ЗАПРОС — его толкает листенер (`ctx.botId`; при мульти-боте у каждого
  // пользователя свой бот). Узел ключей не читает (закон 3) — только проносит пушнутое дальше, чтобы
  // выход-«векторная память» вписал `&bot=<botId>` в провенанс и различил, от кого пришёл факт.
  const botId = String(ctx.botId ?? "").trim();
  return {
    ...captured(ctx, "telegram-bot", text),
    ...(chatId ? { telegramChatId: chatId } : {}),
    ...(botId ? { botId } : {}),
  };
}
