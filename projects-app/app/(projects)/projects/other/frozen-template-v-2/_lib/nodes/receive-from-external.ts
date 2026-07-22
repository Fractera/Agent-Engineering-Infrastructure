// ФУНКЦИЯ УЗЛА «INPUT-CONNECTOR» — принимает данные от узла ДРУГОЙ автоматизации: дверь в групповую.
// По закону вида коннектор присутствует всегда; в одиночной автоматизации он СКРЫТ и не исполняется
// (в сценарии «цена акции» тоже). Имя `receiveFromExternal` — публичный контракт.
//
// Контракт: (ctx) => частичный ctx. Проброс handover как payload.
import type { NodeCtx } from "../executor";

export function receiveFromExternal(ctx: NodeCtx): { payload: unknown } {
  return { payload: ctx.handover ?? ctx.payload ?? null };
}
