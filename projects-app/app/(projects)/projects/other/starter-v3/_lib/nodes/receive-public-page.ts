// ФУНКЦИЯ УЗЛА «INPUT» (канал public-page) — форма на публичной странице автоматизации отправляет
// свою заявку в дверь запуска (`POST api/run { source: "public-page", text }`), и этот узел
// нормализует её в общий `Message`.
//
// От пульта канал отличается ТЕМ, КТО ПИШЕТ: пульт — владелец в кокпите, публичная страница — любой
// посетитель. Нормализация одна и та же; разделение каналов сохраняет источнику имя, по которому
// выходы (дашборд, аналитика) отличают своих от чужих. Пустая заявка — отказ у двери.
// Имя `receivePublicPage` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { captured, channelOf, emptyInput, refuse } from "../message";

export function receivePublicPage(ctx: NodeCtx): NodeCtx {
  if (channelOf(ctx) !== "public-page") return {};
  const text = String(ctx.text ?? ctx.message ?? "").trim();
  if (!text) refuse(emptyInput("public-page"));
  return { ...captured(ctx, "public-page", text) };
}
