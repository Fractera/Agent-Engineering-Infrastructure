// ФУНКЦИЯ УЗЛА «INPUT» (канал control-panel) — принимает сообщение из формы пульта и нормализует его
// в общий контракт `Message` (шаг 300, «захват → развозка»). Пульт — дверь по умолчанию: прогон без
// поля `source` принадлежит ей (закон `passport.md` §6.1 — пульт существует всегда).
//
// Движок исполняет ВСЕ видимые узлы, поэтому чужой прогон (source другого канала) приёмник пропускает,
// возвращая {} — он в нём не участвует. Пустое сообщение — честный отказ у двери (десять языков).
// Имя функции `receiveControlPanel` — публичный контракт, менять нельзя; логику внутри — можно.
import type { NodeCtx } from "../executor";
import { captured, channelOf, emptyInput, refuse } from "../message";

export function receiveControlPanel(ctx: NodeCtx): NodeCtx {
  if (channelOf(ctx) !== "control-panel") return {};
  const text = String(ctx.text ?? ctx.query ?? ctx.message ?? "").trim();
  if (!text) refuse(emptyInput("control-panel"));
  return { ...captured(ctx, "control-panel", text) };
}
