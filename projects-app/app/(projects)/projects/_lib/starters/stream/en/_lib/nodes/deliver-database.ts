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
import { crossLink } from "../components/links/cross-link";

const CONTENT_INTENTS = ["save", "finance", "place"] as const;

/** Вложения/векторы всплеска — общий кусок для строк finance и заметки. */
function attachmentsOf(ctx: NodeCtx): { storageIds: string[]; vectorIds: string[] } {
  const vectorRowId = String(ctx.vectorRowId ?? "").trim();
  const atts = Array.isArray(ctx.attachments) ? (ctx.attachments as { fileKey: string }[]) : [];
  return { storageIds: atts.map((a) => a.fileKey).filter(Boolean), vectorIds: vectorRowId ? [vectorRowId] : [] };
}

/**
 * СТРОКА ФИНАНСА из контекста (или null, если денег в прогоне нет). Единственный источник формы строки
 * `finance` — им пользуются И `deliverDatabase` (пишет сразу), И `dedupeGuard` (шаг 310: держит payload до
 * подтверждения владельца). Одна форма в одном месте — hold-and-confirm не разъедется с реальной записью.
 */
export function financeRowFrom(ctx: NodeCtx): Record<string, unknown> | null {
  const finance = (ctx.finance && typeof ctx.finance === "object" ? ctx.finance : null) as
    | { kind?: string; amount?: number | null; categories?: string[]; summary?: string; store?: string; currency?: string; items?: unknown[]; date?: string }
    | null;
  if (!finance) return null;
  const m = messageOf(ctx);
  const { storageIds, vectorIds } = attachmentsOf(ctx);
  return {
    kind: finance.kind ?? "expense",
    amount: finance.amount ?? null,
    categories: Array.isArray(finance.categories) ? finance.categories : [],
    summary: finance.summary ?? m.text,
    name: finance.summary ?? m.title,
    store: finance.store ?? "",
    currency: finance.currency ?? "",
    items: Array.isArray(finance.items) ? finance.items : [],
    source: m.source, date: finance.date || m.at, storageIds, vectorIds,
  };
}

/** СТРОКА ЗАМЕТКИ из контекста (или null, если нет намерения `save`). Тот же единый источник формы. */
export function noteRowFrom(ctx: NodeCtx): Record<string, unknown> | null {
  if (!servesIntent(ctx, "save")) return null;
  const m = messageOf(ctx);
  const { storageIds, vectorIds } = attachmentsOf(ctx);
  return { name: m.title, text: m.text, source: m.source, date: m.at, storageIds, vectorIds };
}

export async function deliverDatabase(ctx: NodeCtx): Promise<{ databaseRowId: string; financeRowId?: string }> {
  // Склад БД (308.8): пишем для содержательных намерений (save|finance|place), НЕ для чистого recall.
  // Backward-compat: нет классификатора → пишем заметку как раньше.
  if (!servesAnyIntent(ctx, CONTENT_INTENTS)) return { databaseRowId: "" };
  // ДУБ-КОНТРОЛЬ (310): `dedupeGuard` придержал запись (нашёл вероятный дубль и спросил владельца, или уже
  // разрешил её сам). Тогда склад молчит — писать нельзя, иначе задвоим то, что и так под вопросом.
  if (ctx.skipDatabase === true) return { databaseRowId: "" };

  // ФИНАНС → ОТДЕЛЬНАЯ ТАБЛИЦА (паритет v1): `digitizeMoney` оставил `ctx.finance` → денежное движение в
  // таблицу `finance`. СОСТАВНОЕ сообщение (кафе: и впечатление, и покупка) создаёт ОБЕ записи. Форма строки
  // берётся из общего билдера (`financeRowFrom`) — тот же, которым `dedupeGuard` держит payload.
  let financeRowId: string | undefined;
  const frowData = financeRowFrom(ctx);
  if (frowData) {
    const frow = await addRow("finance", frowData);
    financeRowId = frow.id;
  }

  // ЗАМЕТКА: пишем, если есть намерение `save` (или нет классификатора — простой стартер). Для чистого
  // finance/place заметку-дубль не плодим; для составного save+finance — заметка идёт ВМЕСТЕ с финансом.
  let databaseRowId = "";
  const nrowData = noteRowFrom(ctx);
  if (nrowData) {
    const nrow = await addRow("database", nrowData);
    databaseRowId = nrow.id;
  }

  // Связь всех-ко-всем (309): связать db и finance со всеми соседями прогона И взаимно друг с другом.
  if (databaseRowId) await crossLink(ctx, "database", databaseRowId, financeRowId ? [{ table: "finance", id: financeRowId }] : []);
  if (financeRowId) await crossLink(ctx, "finance", financeRowId, databaseRowId ? [{ table: "database", id: databaseRowId }] : []);

  return { databaseRowId, ...(financeRowId ? { financeRowId } : {}) };
}
