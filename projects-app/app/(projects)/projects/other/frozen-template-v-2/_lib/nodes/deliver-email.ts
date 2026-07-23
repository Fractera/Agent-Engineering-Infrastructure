// ФУНКЦИЯ УЗЛА «OUTPUT» (канал email) — отправляет результат прогона письмом.
//
// САМА ОТПРАВКА ЖИВЁТ НЕ ЗДЕСЬ, а в `_lib/transport.ts`: письмо шлёт не только этот узел, но и
// календарь по наступлению записи, и два разных вызова Resend означали бы два места, где чинить
// просроченный ключ. Здесь — только то, что принадлежит УЗЛУ: как из общего контекста прогона собрать
// адресата, тему и текст.
//
// Провал доставки БРОСАЕТ (закон `kind.output.md`) — транспорт уже бросает сам, здесь ничего не глушим.
// Имя `deliverEmail` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { sendEmail } from "../transport";

export async function deliverEmail(ctx: NodeCtx): Promise<{ emailId: string }> {
  // Имена полей — публичный контракт этого узла: середина потока кладёт в них то, что нужно отправить.
  const to = String(ctx.emailTo ?? ctx.to ?? "").trim();
  const subject = String(ctx.emailSubject ?? ctx.subject ?? "").trim();
  const text = String(ctx.emailBody ?? ctx.body ?? ctx.answer ?? ctx.result ?? "").trim();

  if (!to) throw new Error("no recipient: the flow must put an address into emailTo");
  if (!subject && !text) throw new Error("nothing to send: the flow must put emailSubject or emailBody into the context");

  return { emailId: await sendEmail(to, subject, text) };
}
