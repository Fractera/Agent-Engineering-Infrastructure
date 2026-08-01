// ФУНКЦИЯ УЗЛА «OUTPUT» (канал email) — отправляет захваченное сообщение письмом.
//
// САМА ОТПРАВКА ЖИВЁТ НЕ ЗДЕСЬ, а в `_lib/transport.ts`: письмо шлёт не только этот узел, но и
// календарь по наступлению записи, и два разных вызова Resend означали бы два места, где чинить
// просроченный ключ. Здесь — только то, что принадлежит УЗЛУ: собрать адресата, тему и текст.
//
// АДРЕСАТ, по убыванию явности: `emailTo` из потока → отправитель входного письма (`emailFrom` —
// честный ответ тому, кто написал) → `RESEND_TO_EMAIL` из окружения (адрес владельца).
//
// ДВЕ РАЗНЫЕ НЕУДАЧИ — ДВА РАЗНЫХ ОТВЕТА (закон развозки, шаг 300): канал НЕ НАСТРОЕН (нет ключа или
// адресата) → честный ПРОПУСК с причиной в контексте — неподключённый канал не должен убивать доставку
// в остальные десять; сервис ОТВЕТИЛ ОТКАЗОМ → бросок (транспорт бросает сам, здесь ничего не глушим).
// Имя `deliverEmail` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf } from "../message";
import { sendEmail } from "../transport";

export async function deliverEmail(ctx: NodeCtx): Promise<{ emailDelivery: string }> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return { emailDelivery: "skipped: RESEND_API_KEY / RESEND_FROM_EMAIL are not set — connect the email channel in Settings" };
  }
  const m = messageOf(ctx);
  const to = String(ctx.emailTo ?? ctx.emailFrom ?? process.env.RESEND_TO_EMAIL ?? "").trim();
  if (!to) return { emailDelivery: "skipped: no recipient — put emailTo into the flow or set RESEND_TO_EMAIL" };

  const id = await sendEmail(to, m.title, `${m.text}\n\n— captured from ${m.source} at ${m.at}`);
  return { emailDelivery: `sent ${id} to ${to}` };
}
