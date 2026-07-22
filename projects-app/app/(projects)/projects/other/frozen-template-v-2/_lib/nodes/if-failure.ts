// ФУНКЦИЯ УЗЛА «CONDITION-FAILURE» — ветка отказа: тупик. По виду `condition-failure` выходного порта
// нет — из узла ничего не вытекает. В сценарии «цена акции» реальный отказ уже остановил цепочку броском
// в `transformPayload`, поэтому это визуальный узел-тупик (no-op). Имя `ifFailure` — публичный контракт.
//
// Контракт: (ctx) => частичный ctx. Ничего не добавляет и ничего дальше не передаёт (у узла нет выхода).
import type { NodeCtx } from "../executor";

export function ifFailure(_ctx: NodeCtx): Record<string, never> {
  return {};
}
