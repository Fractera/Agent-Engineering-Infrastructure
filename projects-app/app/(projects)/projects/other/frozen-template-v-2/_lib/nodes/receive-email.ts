// ФУНКЦИЯ УЗЛА «INPUT» (канал email) — принимает пришедшее письмо и нормализует его в общий `Message`.
//
// ОТКУДА ОНО БЕРЁТСЯ: письмо ТОЛКАЕТ провайдер в дверь `api/inbound-email`, которая разбирает конверт,
// помечает прогон `source: "email"` и запускает его. Ящик никто не опрашивает — закон «вход только push»
// (шаг 263.1): опрос почты сделал бы вход зависимым от таймера и задваивал бы письма.
//
// НАЗЫВАНИЕ, А НЕ РАЗБОР. Узел-вход даёт середине понятные имена и не решает, что с ними делать.
// Текстом сообщения становится тело письма (или тема, если тела нет); отправитель и тема остаются в
// контексте (`emailFrom`/`emailSubject`) — выход «письмо» вправе ответить именно отправителю.
// Имя `receiveEmail` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { captured, channelOf, emptyInput, refuse } from "../message";

export function receiveEmail(ctx: NodeCtx): NodeCtx {
  if (channelOf(ctx) !== "email") return {};
  const from = String(ctx.from ?? ctx.emailFrom ?? "").trim();
  const subject = String(ctx.subject ?? ctx.emailSubject ?? "").trim();
  const body = String(ctx.text ?? ctx.emailBody ?? "").trim();

  // Письмо без отправителя — не письмо: провайдер такого не пришлёт, а если прислал, это подделка.
  if (!from) throw new Error("the letter has no sender — refusing to start a run on it");
  const text = body || subject;
  if (!text) refuse(emptyInput("email"));

  return { ...captured(ctx, "email", text), emailFrom: from, emailSubject: subject };
}
