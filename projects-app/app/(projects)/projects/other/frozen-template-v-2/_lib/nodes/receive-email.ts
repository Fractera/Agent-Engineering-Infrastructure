// ФУНКЦИЯ УЗЛА «INPUT» (канал email) — принимает пришедшее письмо и НАЗЫВАЕТ его для середины.
//
// ОТКУДА ОНО БЕРЁТСЯ: письмо ТОЛКАЕТ провайдер в дверь `api/inbound-email`, которая разбирает конверт и
// запускает прогон. Ящик никто не опрашивает — закон «вход только push» (шаг 263.1, раунды 16–18):
// опрос почты сделал бы вход зависимым от таймера и задваивал бы письма.
//
// НАЗЫВАНИЕ, А НЕ РАЗБОР. Узел-вход даёт середине понятные имена и не решает, что с ними делать: тема,
// текст, отправитель. Тот, кто хочет вытащить из письма смысл, — это середина потока, отдельный узел.
//
// Имя `receiveEmail` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";

export function receiveEmail(ctx: NodeCtx): { emailFrom: string; emailSubject: string; query: string } {
  const from = String(ctx.from ?? ctx.emailFrom ?? "").trim();
  const subject = String(ctx.subject ?? ctx.emailSubject ?? "").trim();
  const text = String(ctx.text ?? ctx.emailBody ?? "").trim();

  // Письмо без отправителя — не письмо: провайдер такого не пришлёт, а если прислал, это подделка.
  if (!from) throw new Error("the letter has no sender — refusing to start a run on it");
  if (!subject && !text) throw new Error("the letter is empty: neither subject nor text");

  // `query` — то же имя, каким называет обращение пульт: середина не обязана знать, ПРИШЛО оно письмом
  // или пришло из формы. Именно это и делает канал сменным.
  return { emailFrom: from, emailSubject: subject, query: text || subject };
}
