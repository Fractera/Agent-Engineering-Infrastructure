// ФУНКЦИЯ УЗЛА «OUTPUT» (канал dashboard) — доставляет результат: пишет строку в таблицу `history`
// дашборда автоматизации (эталон v1 record-result). Достигается ТОЛЬКО после ветки успеха, поэтому в bag
// уже лежат company/ticker/price. Имя `deliverResult` — публичный контракт, не переименовывать.
//
// Контракт: (ctx) => частичный ctx. Хранилище строк — локальное (_lib/rows.ts → _data/runtime/rows.jsonl),
// внутри папки: закон 0 (никакого платформенного lib/dashboard-rows).
import type { NodeCtx } from "../executor";
import { addRow } from "../rows";

export async function deliverResult(ctx: NodeCtx): Promise<{ rowId: string }> {
  const row = await addRow("history", {
    date: new Date().toISOString(),
    company: String(ctx.company ?? ""),
    ticker: String(ctx.ticker ?? ""),
    price: typeof ctx.price === "number" ? ctx.price : null,
  });
  return { rowId: row.id };
}
