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
import { sendTelegram, sendTelegramPhoto } from "../transport";
import { readObject } from "../store";

export async function deliverUserTelegramChat(ctx: NodeCtx): Promise<{ userTelegramDelivery: string }> {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return { userTelegramDelivery: "skipped: TELEGRAM_BOT_TOKEN is not set — connect the Telegram channel in Settings" };
  }
  const chatId = String(ctx.telegramChatId ?? process.env.TELEGRAM_USER_CHAT_ID ?? "").trim();
  if (!chatId) {
    return { userTelegramDelivery: "skipped: no user chat — link it via api/telegram/link (TELEGRAM_USER_CHAT_ID)" };
  }
  // 🔒 ДОСТАВКА НЕ СОЧИНЯЕТ РЕЧЬ (шаг 312, вариант B — отмена решения 308). Раньше этот узел сам звал
  // `converse`, и ответ собирался в ДВУХ местах — здесь и в `api/run`. Теперь речь производит УЗЕЛ РЕЧИ
  // (слой `speech`, стоит перед выходами), а канал только развозит готовое `ctx.reply`. Ответа нет
  // (речь скрыта / чат не опознан) — прежний сырой путь ниже, чтобы стартер жил без разговорного слоя.
  const reply = String(ctx.reply ?? "").trim();
  if (reply) {
    const id = await sendTelegram(reply, chatId);
    // ВОЗВРАТ ИЗОБРАЖЕНИЙ ВСЛЕД ЗА ТЕКСТОМ (309): если прогон оставил ключи связанных объектов в
    // `recalledAttachments`, шлём сами изображения — ответ на «покажи» возвращает картинку, а не только
    // слова. Недоступный объект — тихо пропуск. Сегодня этот ключ не кладёт ни один узел: механизм ждёт
    // узла чтения своего (шаг 312), кода-обещания пользователю здесь нет.
    const atts = Array.isArray(ctx.recalledAttachments) ? (ctx.recalledAttachments as unknown[]).map(String).filter(Boolean) : [];
    for (const key of atts.slice(0, 5)) {
      try {
        const obj = await readObject(key);
        if (obj) await sendTelegramPhoto(obj.bytes, key, chatId);
      } catch { /* картинку не смогли отдать — текст уже ушёл, не валим прогон */ }
    }
    return { userTelegramDelivery: `sent ${id} to ${chatId}${atts.length ? ` (+${atts.length} img)` : ""}` };
  }
  const m = messageOf(ctx);
  const stem = m.title.replace(/…$/, "");
  const titleAddsNothing = !stem || m.text.replace(/\s+/g, " ").trim().startsWith(stem.replace(/\s+/g, " ").trim());
  const id = await sendTelegram(`${titleAddsNothing ? "" : `${m.title}\n\n`}${m.text}\n\n— captured from ${m.source}`, chatId);
  return { userTelegramDelivery: `sent ${id} to ${chatId}` };
}
