// ФУНКЦИЯ УЗЛА «INPUT» (канал webhook) — внешняя система стучится по HTTP в дверь запуска
// (`POST api/run { source: "webhook", … }`), и этот узел нормализует её JSON-тело в общий `Message`.
//
// Текст ищется по убыванию явности: `text` → `message` → `payload` (объект честно сериализуется —
// вебхук вправе прислать структуру, и терять её нельзя). Пустое тело — отказ у двери. Вход только
// push (закон 3): никакого опроса чужих систем здесь нет и быть не может.
// Имя `receiveWebhook` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { captured, channelOf, emptyInput, refuse } from "../message";

export function receiveWebhook(ctx: NodeCtx): NodeCtx {
  if (channelOf(ctx) !== "webhook") return {};
  const raw = ctx.text ?? ctx.message ?? ctx.payload;
  const text = (typeof raw === "string" ? raw : raw == null ? "" : JSON.stringify(raw)).trim();
  if (!text) refuse(emptyInput("webhook"));
  return { ...captured(ctx, "webhook", text) };
}
