// ФУНКЦИЯ УЗЛА «OUTPUT» (канал database) — пишет захваченное сообщение записью в локальную базу
// автоматизации: строка таблицы `database` в форме, которую читает вкладка (поля клиента: name ·
// storageIds · vectorIds · createdAt). По закону складов запись базы ДЕРЖИТ ССЫЛКИ на соседние
// склады: если в этом же прогоне выход памяти уже запомнил факт, его id ложится в `vectorIds`
// (выход склада исполняется позже по порядку рождения — его ключ сюда попасть не может, и это
// честно отражает порядок развозки, а не теряется молча).
//
// Имя `deliverDatabase` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf, servesAnyIntent, servesIntent } from "../message";
import { addRow } from "../rows";

const CONTENT_INTENTS = ["save", "finance", "place"] as const;

export async function deliverDatabase(ctx: NodeCtx): Promise<{ databaseRowId: string; financeRowId?: string }> {
  // Склад БД (308.8): пишем для содержательных намерений (save|finance|place), НЕ для чистого recall.
  // Backward-compat: нет классификатора → пишем заметку как раньше.
  if (!servesAnyIntent(ctx, CONTENT_INTENTS)) return { databaseRowId: "" };
  const m = messageOf(ctx);
  const vectorRowId = String(ctx.vectorRowId ?? "").trim();
  // Привязка вложений всплеска (308.6): запись НЕСЁТ ссылки на объекты (интерьер + чек → и заметка, и финанс).
  const atts = Array.isArray(ctx.attachments) ? (ctx.attachments as { fileKey: string }[]) : [];
  const storageIds = atts.map((a) => a.fileKey).filter(Boolean);
  const vectorIds = vectorRowId ? [vectorRowId] : [];

  // ФИНАНС → ОТДЕЛЬНАЯ ТАБЛИЦА (паритет v1): `digitizeMoney` оставил `ctx.finance` → денежное движение в
  // таблицу `finance` со своими полями. СОСТАВНОЕ сообщение (кафе: и впечатление, и покупка) создаёт ОБЕ
  // записи — финанс здесь, заметку ниже, потому что оба намерения стоят в `ctx.intent`.
  const finance = (ctx.finance && typeof ctx.finance === "object" ? ctx.finance : null) as
    | { kind?: string; amount?: number | null; categories?: string[]; summary?: string }
    | null;
  let financeRowId: string | undefined;
  if (finance) {
    const frow = await addRow("finance", {
      kind: finance.kind ?? "expense",
      amount: finance.amount ?? null,
      categories: Array.isArray(finance.categories) ? finance.categories : [],
      summary: finance.summary ?? m.text,
      name: finance.summary ?? m.title,
      source: m.source, date: m.at, storageIds, vectorIds,
    });
    financeRowId = frow.id;
  }

  // ЗАМЕТКА: пишем, если есть намерение `save` (или нет классификатора — простой стартер). Для чистого
  // finance/place заметку-дубль не плодим; для составного save+finance — заметка идёт ВМЕСТЕ с финансом.
  if (servesIntent(ctx, "save")) {
    const nrow = await addRow("database", { name: m.title, text: m.text, source: m.source, date: m.at, storageIds, vectorIds });
    return { databaseRowId: nrow.id, ...(financeRowId ? { financeRowId } : {}) };
  }
  return { databaseRowId: "", ...(financeRowId ? { financeRowId } : {}) };
}
