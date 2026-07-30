// ФУНКЦИЯ УЗЛА «OUTPUT» (канал database) — пишет захваченное сообщение записью в локальную базу
// автоматизации: строка таблицы `database` в форме, которую читает вкладка (поля клиента: name ·
// storageIds · vectorIds · createdAt). По закону складов запись базы ДЕРЖИТ ССЫЛКИ на соседние
// склады: если в этом же прогоне выход памяти уже запомнил факт, его id ложится в `vectorIds`
// (выход склада исполняется позже по порядку рождения — его ключ сюда попасть не может, и это
// честно отражает порядок развозки, а не теряется молча).
//
// Имя `deliverDatabase` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf } from "../message";
import { addRow } from "../rows";

export async function deliverDatabase(ctx: NodeCtx): Promise<{ databaseRowId: string }> {
  const m = messageOf(ctx);
  const vectorRowId = String(ctx.vectorRowId ?? "").trim();
  const row = await addRow("database", {
    name: m.title,
    text: m.text,
    source: m.source,
    date: m.at,
    storageIds: [],
    vectorIds: vectorRowId ? [vectorRowId] : [],
  });
  return { databaseRowId: row.id };
}
