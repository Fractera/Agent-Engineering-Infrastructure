import type { Entity } from "../../_data/automation.schema";

// КОЛОНКИ ТАБЛИЦЫ — единственное место, где читается объявление таблицы из ядра. Обе половины (сама
// таблица и её настройка) берут колонки отсюда: одно объявление — один читатель, разойтись не могут.
//
// В ядре колонка — либо просто ключ ("price"), либо объект с подписью на десяти языках. Так таблица
// заводится одной строкой, а подписывается тогда, когда владельцу это важно.
export type Column = { key: string; label?: unknown };

export function columnsOf(entity: Entity): Column[] {
  const raw = (entity.data as Record<string, unknown>).columns;
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => (typeof c === "string" ? { key: c } : (c as Column))).filter((c) => Boolean(c?.key));
}

/** Имя таблицы в локальном хранилище строк (_lib/rows.ts). Не объявлено — берём имя сущности. */
export const tableOf = (entity: Entity): string =>
  String((entity.data as Record<string, unknown>).table ?? entity.name).toLowerCase();
