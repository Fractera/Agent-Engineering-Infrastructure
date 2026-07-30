// ФУНКЦИЯ УЗЛА «OUTPUT» (канал database) — пишет захваченное сообщение записью в локальную базу
// автоматизации: строка таблицы `database` в форме, которую читает вкладка (поля клиента: name ·
// storageIds · vectorIds · createdAt). По закону складов запись базы ДЕРЖИТ ССЫЛКИ на соседние
// склады: если в этом же прогоне выход памяти уже запомнил факт, его id ложится в `vectorIds`
// (выход склада исполняется позже по порядку рождения — его ключ сюда попасть не может, и это
// честно отражает порядок развозки, а не теряется молча).
//
// Имя `deliverDatabase` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf, servesAnyIntent } from "../message";
import { addRow } from "../rows";

const CONTENT_INTENTS = ["save", "finance", "place"] as const;

export async function deliverDatabase(ctx: NodeCtx): Promise<{ databaseRowId: string }> {
  // Склад БД (308.8): пишем запись для содержательных намерений (save|finance|place), НЕ для чистого recall
  // (вопрос памяти в базу не кладём). Backward-compat: нет классификатора → пишем как раньше.
  if (!servesAnyIntent(ctx, CONTENT_INTENTS)) return { databaseRowId: "" };
  const m = messageOf(ctx);
  const vectorRowId = String(ctx.vectorRowId ?? "").trim();
  // Привязка вложений всплеска (308.6): запись НЕСЁТ ссылки на все объекты, зарегистрированные
  // `storeAttachment`/`linkAttachments` в этом прогоне (интерьер + чек → и заметка, и финанс их держат).
  const atts = Array.isArray(ctx.attachments) ? (ctx.attachments as { fileKey: string }[]) : [];
  const storageIds = atts.map((a) => a.fileKey).filter(Boolean);

  // ФИНАНС → ОТДЕЛЬНАЯ ТАБЛИЦА (308.8, паритет v1): если `digitizeMoney` оставил `ctx.finance`, запись
  // денежного движения идёт в таблицу `finance` со своими полями (kind/amount/categories/summary), а не в
  // общую `database`. Так реестр трат отделён от заметок, как и было в v1.
  const finance = (ctx.finance && typeof ctx.finance === "object" ? ctx.finance : null) as
    | { kind?: string; amount?: number | null; categories?: string[]; summary?: string }
    | null;
  if (finance) {
    const row = await addRow("finance", {
      kind: finance.kind ?? "expense",
      amount: finance.amount ?? null,
      categories: Array.isArray(finance.categories) ? finance.categories : [],
      summary: finance.summary ?? m.text,
      name: finance.summary ?? m.title,
      source: m.source,
      date: m.at,
      storageIds,
      vectorIds: vectorRowId ? [vectorRowId] : [],
    });
    return { databaseRowId: row.id };
  }

  const row = await addRow("database", {
    name: m.title,
    text: m.text,
    source: m.source,
    date: m.at,
    storageIds,
    vectorIds: vectorRowId ? [vectorRowId] : [],
  });
  return { databaseRowId: row.id };
}
