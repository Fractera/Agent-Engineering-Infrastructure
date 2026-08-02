// ФУНКЦИЯ УЗЛА «OUTPUT» (канал database) — пишет результат прогона ЗАПИСЬЮ в локальную базу
// автоматизации: строка таблицы `database` в форме, которую читает вкладка (name · text · source ·
// date · storageIds · vectorIds). По закону складов запись ДЕРЖИТ ССЫЛКИ на соседние склады: объекты
// этого прогона и его вектор-документ.
//
// 🔒 НЕЙТРАЛЬНОСТЬ (шаг 311.6). Здесь была вторая половина домена v2: таблица `finance`, поля
// `kind: "expense"`, `store`, `currency`, `items`, словарь `save|finance|place`. Срединные доменные
// узлы были удалены при рождении v3, а этот код остался — и любая новая автоматизация писала бы свой
// «предмет» в таблицу расходов. Склад обязан знать ФОРМУ записи, а не предметную область: что именно
// записывается, решает середина, а какой таблицей это назвать — уже домен. Тест нейтральности: замени
// «предмет» на заявку, деталь, пациента, груз — этот файл не меняется ни строкой.
//
// Имя `deliverDatabase` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { messageOf } from "../message";
import { addEntityRow } from "../rows";
import { crossLink } from "../components/links/cross-link";

/**
 * ФОРМА ЗАПИСИ — единственный источник (закон 2). Середина, которой нужно придержать запись до
 * подтверждения человека, строит её ЭТИМ билдером и кладёт в контекст; склад тогда пишет придержанное
 * вместо того, чтобы собирать вторую версию той же строки.
 */
export function recordRowFrom(ctx: NodeCtx): Record<string, unknown> {
  const m = messageOf(ctx);
  const atts = Array.isArray(ctx.attachments) ? (ctx.attachments as { fileKey: string }[]) : [];
  const vectorRowId = String(ctx.vectorRowId ?? "").trim();
  // ПОЛЯ, ДОБАВЛЕННЫЕ СЕРЕДИНОЙ. Склад не изобретает структуру записи: если срединный узел разобрал
  // сообщение в поля (`ctx.record`), они ложатся в строку как есть. Их имена — забота той автоматизации,
  // которая их завела, а не этого файла.
  const fields = (ctx.record && typeof ctx.record === "object" ? ctx.record : {}) as Record<string, unknown>;
  return {
    name: m.title,
    text: m.text,
    source: m.source,
    date: m.at,
    storageIds: atts.map((a) => a.fileKey).filter(Boolean),
    vectorIds: vectorRowId ? [vectorRowId] : [],
    ...fields,
  };
}

export async function deliverDatabase(ctx: NodeCtx): Promise<{ databaseRowId: string }> {
  // ВОПРОС — НЕ ЗАПИСЬ, и «середине нечего писать» — тоже: оба правила держит `addEntityRow`, единая
  // точка записи в склад сущностей (311.9а). Здесь остаётся только частное правило этого склада.
  // Середина придержала запись (например ждёт подтверждения человека) → склад молчит, иначе задвоим.
  if (ctx.skipDatabase === true) return { databaseRowId: "" };

  const row = await addEntityRow("database", recordRowFrom(ctx), ctx);
  if (!row) return { databaseRowId: "" };
  await crossLink(ctx, "database", row.id); // связь всех-ко-всем: запись ↔ объекты и вектор этого прогона
  return { databaseRowId: row.id };
}
