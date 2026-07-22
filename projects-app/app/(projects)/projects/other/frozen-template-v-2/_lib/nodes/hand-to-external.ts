// ФУНКЦИЯ УЗЛА «OUTPUT-CONNECTOR» — передаёт результат узлу ДРУГОЙ автоматизации: дверь наружу в
// групповую. В одиночной автоматизации узел СКРЫТ и не исполняется. Имя `handToExternal` — публичный
// контракт, не переименовывать.
//
// Контракт: (ctx) => частичный ctx. Отдаёт результат тому, кто ждёт на той стороне.
import type { NodeCtx } from "../executor";

export function handToExternal(ctx: NodeCtx): { handover: unknown } {
  return { handover: ctx.result ?? ctx.price ?? null };
}
