// ТИПЫ микросервиса «дашборд» (админ-половина) — ДЕВ-СЛОЙ. Автоматизация-агностичны: структурная форма
// того, что отдаёт дверь `api/core?select=tab:dashboard`, а не импорт схемы автоматизации.

/** Объявленная колонка таблицы: либо просто ключ, либо ключ с подписью на десяти языках. */
export type Column = { key: string; label?: unknown };

/** Сущность вкладки — одна таблица. `data` несёт объявление колонок и имя хранилища. */
export type TableEntity = {
  cuid: string;
  name: string;
  data: Record<string, unknown>;
};

export type DashboardTab = {
  name: string;
  entities: TableEntity[];
};

export function columnsOf(entity: TableEntity): Column[] {
  const raw = entity.data.columns;
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => (typeof c === "string" ? { key: c } : (c as Column))).filter((c) => Boolean(c?.key));
}

/** Имя таблицы в хранилище строк. Не объявлено — берём имя сущности. */
export const tableOf = (entity: TableEntity): string =>
  String(entity.data.table ?? entity.name).toLowerCase();
