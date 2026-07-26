// ФУНКЦИЯ УЗЛА «OUTPUT» (канал dashboard) — доставляет сообщение в таблицу `history` дашборда:
// одна строка на каждый успешный прогон (дата · канал · заголовок · текст). Достигается ТОЛЬКО после
// ветки успеха, поэтому сообщение в контексте уже проверено серединой.
//
// Хранилище строк — локальное (_lib/rows.ts → _data/runtime/rows.jsonl), внутри папки: закон 0.
// Имя `deliverResult` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf } from "../message";
import { addRow } from "../rows";

export async function deliverResult(ctx: NodeCtx): Promise<{ rowId: string }> {
  const m = messageOf(ctx);
  const row = await addRow("history", { date: m.at, source: m.source, title: m.title, text: m.text });
  return { rowId: row.id };
}
