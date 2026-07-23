// ФУНКЦИЯ УЗЛА «OUTPUT» (канал email) — отправляет результат письмом через Resend.
//
// КЛЮЧИ ЧИТАЮТСЯ ИЗ ОКРУЖЕНИЯ, НЕ ИЗ ФАЙЛА (закон `kind.output.md`): `RESEND_API_KEY` и
// `RESEND_FROM_EMAIL` объявлены в `envKeys` этого узла и вводятся формой ключей — секрет в файле папки
// не лежит никогда.
//
// ПРОВАЛ ДОСТАВКИ БРОСАЕТ, и это закон, а не выбор: дверь, проглотившая ошибку почтового сервиса,
// отчитается об успехе, который владелец обнаружит ложным через несколько дней. Отказ Resend приходит
// сюда телом ответа и уходит в отчёт прогона как есть.
//
// Имя `deliverEmail` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";

const ENDPOINT = "https://api.resend.com/emails";

export async function deliverEmail(ctx: NodeCtx): Promise<{ emailId: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  // Отсутствие ключа — не «письмо не ушло», а «канал не подключён»: говорим об этом прямо, иначе
  // владелец будет искать ошибку в тексте письма.
  if (!apiKey) throw new Error("RESEND_API_KEY is not set — connect the email channel in the menu first");
  if (!from) throw new Error("RESEND_FROM_EMAIL is not set — connect the email channel in the menu first");

  // Что отправлять, говорит середина потока. Имена полей — публичный контракт этого узла.
  const to = String(ctx.emailTo ?? ctx.to ?? "").trim();
  const subject = String(ctx.emailSubject ?? ctx.subject ?? "").trim();
  const text = String(ctx.emailBody ?? ctx.body ?? ctx.answer ?? ctx.result ?? "").trim();
  if (!to) throw new Error("no recipient: the flow must put an address into emailTo");
  if (!subject && !text) throw new Error("nothing to send: the flow must put emailSubject or emailBody into the context");

  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: subject || "(no subject)", text }),
  });

  const answer = (await r.json().catch(() => null)) as { id?: string; message?: string; name?: string } | null;
  if (!r.ok) {
    // Ответ сервиса — самое ценное, что здесь есть: он объясняет и неподтверждённый домен, и просроченный ключ.
    throw new Error(`Resend refused the letter (HTTP ${r.status}): ${answer?.message ?? answer?.name ?? "no details"}`);
  }
  if (!answer?.id) throw new Error("Resend accepted the request but returned no message id — treat that as a failure");

  return { emailId: answer.id };
}
